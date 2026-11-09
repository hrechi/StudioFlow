// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * StudioFlow — Allocation Blockchain (module owner: Mohamed Yessine Nehdi).
 *
 * Rebuilt from the app's ABI (src/modules/allocation/contract/EquipmentAllocation.json) and the
 * rules in src/modules/allocation/README.md, because the original StudioFlow-Blockchain project
 * is not in the repository. The interface (functions, events, errors, enum order) is identical,
 * so the app works with it unchanged.
 *
 * The contract enforces the rules; MongoDB is only a mirror of what was proven here.
 * Ids are keccak256(ObjectId string): no personal data on-chain, people are wallet addresses.
 */
contract EquipmentAllocation {
    // Same order as the app: CONDITION_FROM_INDEX / STATUS_FROM_INDEX in allocation.rules.ts.
    enum Condition { New, Good, Worn, OutOfOrder }
    enum Status { None, Pending, Confirmed, InUse, Returned, Cancelled }

    struct Equipment {
        Condition condition;
        bool active;
        bool exists;
    }

    struct Allocation {
        bytes32 equipmentId;
        bytes32 seanceId;
        address bookedBy;
        uint64 start;
        uint64 end;
        Status status;
        Condition returnCondition;
        uint64 createdAt;
    }

    address public owner;
    mapping(address => bool) public staff;
    mapping(bytes32 => Equipment) public equipments;
    mapping(bytes32 => Allocation) private allocations;
    mapping(bytes32 => bytes32[]) private equipmentHistory;

    error NotOwner();
    error NotStaff();
    error NotOwnerOrBooker();
    error ZeroAddress();
    error EquipmentAlreadyRegistered(bytes32 equipmentId);
    error EquipmentNotFound(bytes32 equipmentId);
    error EquipmentInactive(bytes32 equipmentId);
    error EquipmentOutOfOrder(bytes32 equipmentId);
    error AllocationAlreadyExists(bytes32 allocationId);
    error AllocationNotFound(bytes32 allocationId);
    error InvalidPeriod();
    error Overlap(bytes32 conflictingAllocationId);
    error InvalidTransition(uint8 from, uint8 to);
    error InvalidReturnCondition(uint8 condition);

    event StaffAdded(address indexed account);
    event StaffRemoved(address indexed account);
    event EquipmentRegistered(bytes32 indexed equipmentId, uint8 condition);
    event EquipmentConditionChanged(bytes32 indexed equipmentId, uint8 condition, address indexed by);
    event EquipmentActiveChanged(bytes32 indexed equipmentId, bool active);
    event BreakdownReported(bytes32 indexed equipmentId, address indexed by);
    event AllocationRequested(
        bytes32 indexed allocationId,
        bytes32 indexed equipmentId,
        bytes32 seanceId,
        address indexed bookedBy,
        uint64 start,
        uint64 end
    );
    event AllocationConfirmed(bytes32 indexed allocationId, address indexed by);
    event EquipmentCheckedOut(bytes32 indexed allocationId, address indexed by);
    event EquipmentReturned(bytes32 indexed allocationId, uint8 condition, address indexed by);
    event AllocationCancelled(bytes32 indexed allocationId, address indexed by);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /** The owner (studio admin) is staff too: they can allocate like a photographer. */
    modifier onlyStaff() {
        if (!staff[msg.sender]) revert NotStaff();
        _;
    }

    constructor() {
        owner = msg.sender;
        staff[msg.sender] = true;
        emit StaffAdded(msg.sender);
    }

    // ── Staff ────────────────────────────────────────────────────────────────

    function addStaff(address account) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        staff[account] = true;
        emit StaffAdded(account);
    }

    function removeStaff(address account) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        staff[account] = false;
        emit StaffRemoved(account);
    }

    // ── Equipment ────────────────────────────────────────────────────────────

    function registerEquipment(bytes32 equipmentId, uint8 condition) external onlyOwner {
        if (equipments[equipmentId].exists) revert EquipmentAlreadyRegistered(equipmentId);
        Condition c = _condition(condition);
        equipments[equipmentId] = Equipment({condition: c, active: true, exists: true});
        emit EquipmentRegistered(equipmentId, condition);
    }

    function setEquipmentCondition(bytes32 equipmentId, uint8 condition) external onlyOwner {
        Equipment storage e = _equipment(equipmentId);
        e.condition = _condition(condition);
        emit EquipmentConditionChanged(equipmentId, condition, msg.sender);
    }

    function setEquipmentActive(bytes32 equipmentId, bool active) external onlyOwner {
        _equipment(equipmentId).active = active;
        emit EquipmentActiveChanged(equipmentId, active);
    }

    /** Any staff member may flag a breakdown; the equipment then can't be allocated. */
    function reportBreakdown(bytes32 equipmentId) external onlyStaff {
        _equipment(equipmentId).condition = Condition.OutOfOrder;
        emit BreakdownReported(equipmentId, msg.sender);
    }

    // ── Allocations ──────────────────────────────────────────────────────────

    function requestAllocation(
        bytes32 allocationId,
        bytes32 equipmentId,
        bytes32 seanceId,
        uint64 start,
        uint64 end
    ) external onlyStaff {
        if (allocations[allocationId].status != Status.None) revert AllocationAlreadyExists(allocationId);
        Equipment storage e = _equipment(equipmentId);
        if (!e.active) revert EquipmentInactive(equipmentId);
        if (e.condition == Condition.OutOfOrder) revert EquipmentOutOfOrder(equipmentId);
        if (end <= start) revert InvalidPeriod();
        bytes32 conflict = _conflict(equipmentId, start, end);
        if (conflict != bytes32(0)) revert Overlap(conflict);

        allocations[allocationId] = Allocation({
            equipmentId: equipmentId,
            seanceId: seanceId,
            bookedBy: msg.sender,
            start: start,
            end: end,
            status: Status.Pending,
            returnCondition: Condition.New,
            createdAt: uint64(block.timestamp)
        });
        equipmentHistory[equipmentId].push(allocationId);
        emit AllocationRequested(allocationId, equipmentId, seanceId, msg.sender, start, end);
    }

    /** Admin: EN_ATTENTE → CONFIRMEE. */
    function confirmAllocation(bytes32 allocationId) external onlyOwner {
        _move(allocationId, Status.Pending, Status.Confirmed);
        emit AllocationConfirmed(allocationId, msg.sender);
    }

    /** Admin or the booker: CONFIRMEE → EN_COURS (the equipment is taken). */
    function checkout(bytes32 allocationId) external {
        _onlyOwnerOrBooker(allocationId);
        _move(allocationId, Status.Confirmed, Status.InUse);
        emit EquipmentCheckedOut(allocationId, msg.sender);
    }

    /** Admin: EN_COURS → RETOURNEE, with the condition it came back in (Good or Worn). */
    function returnEquipment(bytes32 allocationId, uint8 condition) external onlyOwner {
        if (condition != uint8(Condition.Good) && condition != uint8(Condition.Worn)) {
            revert InvalidReturnCondition(condition);
        }
        _move(allocationId, Status.InUse, Status.Returned);
        Allocation storage a = allocations[allocationId];
        a.returnCondition = Condition(condition);
        equipments[a.equipmentId].condition = Condition(condition);
        emit EquipmentReturned(allocationId, condition, msg.sender);
    }

    /** Admin or the booker: ANNULEE, only from EN_ATTENTE or CONFIRMEE. */
    function cancelAllocation(bytes32 allocationId) external {
        _onlyOwnerOrBooker(allocationId);
        Status from = allocations[allocationId].status;
        if (from != Status.Pending && from != Status.Confirmed) {
            revert InvalidTransition(uint8(from), uint8(Status.Cancelled));
        }
        allocations[allocationId].status = Status.Cancelled;
        emit AllocationCancelled(allocationId, msg.sender);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function getAllocation(bytes32 allocationId) external view returns (Allocation memory) {
        Allocation memory a = allocations[allocationId];
        if (a.status == Status.None) revert AllocationNotFound(allocationId);
        return a;
    }

    function getEquipmentHistory(bytes32 equipmentId) external view returns (bytes32[] memory) {
        return equipmentHistory[equipmentId];
    }

    /** The same check requestAllocation makes, so the app can warn before signing. */
    function isAvailable(bytes32 equipmentId, uint64 start, uint64 end) external view returns (bool) {
        Equipment memory e = equipments[equipmentId];
        if (!e.exists || !e.active || e.condition == Condition.OutOfOrder || end <= start) return false;
        return _conflict(equipmentId, start, end) == bytes32(0);
    }

    // ── Internals ────────────────────────────────────────────────────────────

    function _equipment(bytes32 equipmentId) private view returns (Equipment storage e) {
        e = equipments[equipmentId];
        if (!e.exists) revert EquipmentNotFound(equipmentId);
    }

    function _condition(uint8 condition) private pure returns (Condition) {
        if (condition > uint8(Condition.OutOfOrder)) revert InvalidReturnCondition(condition);
        return Condition(condition);
    }

    /** First allocation holding this equipment over [start, end): pending, confirmed or in use. */
    function _conflict(bytes32 equipmentId, uint64 start, uint64 end) private view returns (bytes32) {
        bytes32[] storage history = equipmentHistory[equipmentId];
        for (uint256 i = 0; i < history.length; i++) {
            Allocation storage other = allocations[history[i]];
            bool holding = other.status == Status.Pending
                || other.status == Status.Confirmed
                || other.status == Status.InUse;
            if (holding && start < other.end && other.start < end) return history[i];
        }
        return bytes32(0);
    }

    function _move(bytes32 allocationId, Status from, Status to) private {
        Allocation storage a = allocations[allocationId];
        if (a.status == Status.None) revert AllocationNotFound(allocationId);
        if (a.status != from) revert InvalidTransition(uint8(a.status), uint8(to));
        a.status = to;
    }

    function _onlyOwnerOrBooker(bytes32 allocationId) private view {
        Allocation storage a = allocations[allocationId];
        if (a.status == Status.None) revert AllocationNotFound(allocationId);
        if (msg.sender != owner && msg.sender != a.bookedBy) revert NotOwnerOrBooker();
    }
}
