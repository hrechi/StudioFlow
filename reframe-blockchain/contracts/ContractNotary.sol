// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ContractNotary
 * @notice Registre d'empreintes SHA-256 des contrats PDF ReFrame.
 *         Aucune donnée personnelle n'est stockée : uniquement l'empreinte,
 *         la référence du devis (ex. CTR-2026-0001) et des métadonnées techniques.
 */
contract ContractNotary is AccessControl {
    bytes32 public constant STUDIO_ROLE = keccak256("STUDIO_ROLE");

    enum Status { None, Active, Revoked, Superseded }

    struct Record {
        bytes32 hash;            // SHA-256 du PDF figé
        string  docRef;          // numéro du contrat (ex. CTR-2026-0001)
        uint64  registeredAt;    // horodatage du bloc
        address registeredBy;    // compte du studio
        address client;          // wallet du client (0x0 si pas de co-signature)
        uint64  clientSignedAt;  // 0 tant que le client n'a pas co-signé
        Status  status;
        bytes32 supersededBy;    // empreinte de la version qui remplace celle-ci
    }

    mapping(bytes32 => Record)   private _records;
    mapping(bytes32 => bytes32[]) private _versions; // keccak256(docRef) => historique

    event ContractRegistered(bytes32 indexed hash, string docRef, address indexed studio, address indexed client);
    event ContractSigned(bytes32 indexed hash, address indexed client);
    event ContractRevoked(bytes32 indexed hash, string reason);
    event ContractAmended(bytes32 indexed oldHash, bytes32 indexed newHash);

    error EmptyHash();
    error AlreadyRegistered(bytes32 hash);
    error NotFound(bytes32 hash);
    error NotActive(bytes32 hash);
    error NotTheClient();
    error AlreadySigned();
    error DocRefMismatch();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(STUDIO_ROLE, admin);
    }

    /// @notice Le studio enregistre l'empreinte d'un contrat validé.
    function register(bytes32 hash, string calldata docRef, address client)
        external onlyRole(STUDIO_ROLE)
    {
        _register(hash, docRef, client);
    }

    /// @notice Le client co-signe avec son wallet (MetaMask). Optionnel.
    function clientSign(bytes32 hash) external {
        Record storage r = _records[hash];
        if (r.status != Status.Active) revert NotActive(hash);
        if (r.client == address(0) || r.client != msg.sender) revert NotTheClient();
        if (r.clientSignedAt != 0) revert AlreadySigned();
        r.clientSignedAt = uint64(block.timestamp);
        emit ContractSigned(hash, msg.sender);
    }

    /// @notice Avenant : ancienne version marquée « remplacée », nouvelle enregistrée.
    function amend(bytes32 oldHash, bytes32 newHash, string calldata docRef, address client)
        external onlyRole(STUDIO_ROLE)
    {
        Record storage old = _records[oldHash];
        if (old.status != Status.Active) revert NotActive(oldHash);
        if (keccak256(bytes(old.docRef)) != keccak256(bytes(docRef))) revert DocRefMismatch();
        _register(newHash, docRef, client);
        old.status = Status.Superseded;
        old.supersededBy = newHash;
        emit ContractAmended(oldHash, newHash);
    }

    /// @notice Annulation (le contrat reste consultable, marqué révoqué).
    function revoke(bytes32 hash, string calldata reason) external onlyRole(STUDIO_ROLE) {
        Record storage r = _records[hash];
        if (r.status != Status.Active) revert NotActive(hash);
        r.status = Status.Revoked;
        emit ContractRevoked(hash, reason);
    }

    /// @notice Lecture publique : status == None signifie « empreinte inconnue ».
    function verify(bytes32 hash) external view returns (Record memory) {
        return _records[hash];
    }

    /// @notice Historique des versions d'un même contrat.
    function versionsOf(string calldata docRef) external view returns (bytes32[] memory) {
        return _versions[keccak256(bytes(docRef))];
    }

    function _register(bytes32 hash, string calldata docRef, address client) internal {
        if (hash == bytes32(0)) revert EmptyHash();
        if (_records[hash].status != Status.None) revert AlreadyRegistered(hash);
        _records[hash] = Record(hash, docRef, uint64(block.timestamp), msg.sender, client, 0, Status.Active, bytes32(0));
        _versions[keccak256(bytes(docRef))].push(hash);
        emit ContractRegistered(hash, docRef, msg.sender, client);
    }
}
