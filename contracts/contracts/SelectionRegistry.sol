// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SnapSeal, contract 1: the gallery and the client's selection.
 * Only SHA-256 fingerprints are stored here, never the photos themselves.
 */
contract SelectionRegistry {
    /** Keeps one transaction well under the network's gas limit per transaction. */
    uint256 public constant MAX_PHOTOS = 300;

    struct Gallery {
        address photographer;
        address client;
        uint256 photoCount;
        uint256 createdAt;
        uint256 selectionSubmittedAt;
        bytes32[] selection;
    }

    uint256 public galleryCount;

    mapping(uint256 => Gallery) private galleries;
    mapping(uint256 => mapping(bytes32 => bool)) private inGallery;
    mapping(uint256 => mapping(bytes32 => bool)) private inSelection;

    /** The whole list of fingerprints stays auditable in the event logs. */
    event GalleryCreated(
        uint256 indexed id,
        address indexed photographer,
        address indexed client,
        bytes32[] hashes
    );
    event SelectionSubmitted(uint256 indexed id, address indexed client, bytes32[] hashes);

    /** The photographer (the caller) publishes the fingerprints of the gallery's photos. */
    function createGallery(address client, bytes32[] calldata hashes) external returns (uint256 id) {
        require(client != address(0), "Invalid client address");
        require(client != msg.sender, "Photographer and client must differ");
        require(hashes.length > 0, "Gallery is empty");
        require(hashes.length <= MAX_PHOTOS, "Too many photos");

        id = ++galleryCount;
        Gallery storage gallery = galleries[id];
        gallery.photographer = msg.sender;
        gallery.client = client;
        gallery.photoCount = hashes.length;
        gallery.createdAt = block.timestamp;

        for (uint256 i = 0; i < hashes.length; i++) {
            require(!inGallery[id][hashes[i]], "Duplicate photo");
            inGallery[id][hashes[i]] = true;
        }
        emit GalleryCreated(id, msg.sender, client, hashes);
    }

    /** The designated client validates their selection, once and for all. */
    function submitSelection(uint256 id, bytes32[] calldata hashes) external {
        Gallery storage gallery = galleries[id];
        require(gallery.createdAt != 0, "Unknown gallery");
        require(msg.sender == gallery.client, "Only the designated client");
        require(gallery.selectionSubmittedAt == 0, "Selection is final");
        require(hashes.length > 0, "Selection is empty");

        for (uint256 i = 0; i < hashes.length; i++) {
            require(inGallery[id][hashes[i]], "Photo not in gallery");
            require(!inSelection[id][hashes[i]], "Duplicate photo");
            inSelection[id][hashes[i]] = true;
            gallery.selection.push(hashes[i]);
        }
        gallery.selectionSubmittedAt = block.timestamp;
        emit SelectionSubmitted(id, msg.sender, hashes);
    }

    /** Read by the UI and by DeliveryReceipt. An unknown id returns zeros, it does not revert. */
    function getSelection(uint256 id)
        external
        view
        returns (address photographer, address client, bytes32[] memory hashes, uint256 submittedAt)
    {
        Gallery storage gallery = galleries[id];
        return (gallery.photographer, gallery.client, gallery.selection, gallery.selectionSubmittedAt);
    }

    function getGallery(uint256 id)
        external
        view
        returns (address photographer, address client, uint256 photoCount, uint256 createdAt)
    {
        Gallery storage gallery = galleries[id];
        return (gallery.photographer, gallery.client, gallery.photoCount, gallery.createdAt);
    }

    function isPhotoInGallery(uint256 id, bytes32 hash) external view returns (bool) {
        return inGallery[id][hash];
    }

    function isPhotoSelected(uint256 id, bytes32 hash) external view returns (bool) {
        return inSelection[id][hash];
    }
}
