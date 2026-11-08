// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/** The only thing this contract needs from SelectionRegistry. */
interface ISelectionRegistry {
    function getSelection(uint256 id)
        external
        view
        returns (address photographer, address client, bytes32[] memory hashes, uint256 submittedAt);
}

/** SnapSeal, contract 2: the delivery and the client's confirmation. */
contract DeliveryReceipt {
    struct Delivery {
        bytes32 hash;
        uint256 publishedAt;
        uint256 confirmedAt;
    }

    ISelectionRegistry public immutable registry;

    mapping(uint256 => Delivery) private deliveries;

    event DeliveryPublished(uint256 indexed id, address indexed photographer, bytes32 hash);
    event ReceptionConfirmed(uint256 indexed id, address indexed client);

    /** @param registryAddress the deployed SelectionRegistry */
    constructor(address registryAddress) {
        require(registryAddress != address(0), "Invalid registry address");
        registry = ISelectionRegistry(registryAddress);
    }

    /** The photographer publishes the final file's fingerprint, once a selection is validated. */
    function publishDelivery(uint256 id, bytes32 hash) external {
        (address photographer, , , uint256 submittedAt) = registry.getSelection(id);
        require(photographer != address(0), "Unknown gallery");
        require(msg.sender == photographer, "Only the photographer");
        require(submittedAt != 0, "No validated selection");
        require(deliveries[id].publishedAt == 0, "Already delivered");
        require(hash != bytes32(0), "Invalid hash");

        deliveries[id] = Delivery({hash: hash, publishedAt: block.timestamp, confirmedAt: 0});
        emit DeliveryPublished(id, msg.sender, hash);
    }

    /** The designated client confirms they received the delivery. */
    function confirmReception(uint256 id) external {
        (, address client, , ) = registry.getSelection(id);
        require(client != address(0), "Unknown gallery");
        require(msg.sender == client, "Only the designated client");
        Delivery storage delivery = deliveries[id];
        require(delivery.publishedAt != 0, "Nothing delivered yet");
        require(delivery.confirmedAt == 0, "Already confirmed");

        delivery.confirmedAt = block.timestamp;
        emit ReceptionConfirmed(id, msg.sender);
    }

    function getDelivery(uint256 id)
        external
        view
        returns (bytes32 hash, uint256 publishedAt, uint256 confirmedAt, bool confirmed)
    {
        Delivery storage delivery = deliveries[id];
        return (delivery.hash, delivery.publishedAt, delivery.confirmedAt, delivery.confirmedAt != 0);
    }
}
