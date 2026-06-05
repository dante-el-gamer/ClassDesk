# Drive Sync Specification

## Purpose

Synchronize seating data with Google Drive using the Drive API v3 (drive.file scope). Each user's data is isolated to their own Drive storage and not visible to other users.

## Requirements

### Requirement: Push to Google Drive

The system MUST push local changes to Google Drive when the user triggers sync and is authenticated. Only records marked as "dirty" in the sync state MUST be pushed.

#### Scenario: Push dirty records

- GIVEN a local record marked "dirty" with timestamp T1
- WHEN the user triggers push sync
- THEN the record MUST be serialized to JSON and uploaded to Drive
- AND the local sync state MUST be marked "clean"

#### Scenario: Push with no dirty records

- GIVEN all local records are "clean"
- WHEN the user triggers push sync
- THEN the system MUST report "nothing to sync"
- AND MUST NOT make any Drive API calls

### Requirement: Pull from Google Drive

The system MUST pull remote changes from Google Drive when the user triggers sync. Remote records with newer timestamps MUST overwrite local data.

#### Scenario: Pull newer remote data

- GIVEN a remote record with timestamp T2 and local record with timestamp T1 (T2 > T1)
- WHEN the user triggers pull sync
- THEN the local record MUST be replaced with the remote version
- AND the local sync state MUST be marked "clean"

#### Scenario: Pull with no remote data

- GIVEN a user with no Drive data (fresh account)
- WHEN the user triggers pull sync
- THEN the system MUST report "no remote data found"
- AND MUST NOT modify local records

### Requirement: Conflict Resolution

When the same record is modified locally and remotely since last sync, the system MUST apply last-write-wins based on timestamp and MUST notify the user.

#### Scenario: Local and remote conflict

- GIVEN local record modified at T1 and remote record modified at T2 (T2 > T1)
- WHEN the user triggers sync
- THEN the remote version MUST win
- AND the system MUST notify the user of the conflict resolution

#### Scenario: Equal timestamp conflict

- GIVEN local and remote records with identical timestamps
- WHEN the user triggers sync
- THEN the local version SHOULD win
- AND the user MUST be notified of the tie-break

### Requirement: Offline Queue

If the user is offline or Drive API is unavailable, the system MUST queue sync operations and MUST retry on the next successful sync attempt.

#### Scenario: Offline push queued

- GIVEN dirty local records and no network connectivity
- WHEN the user triggers push sync
- THEN the system MUST keep records as "dirty"
- AND MUST report sync as deferred

#### Scenario: Retry on reconnection

- GIVEN queued dirty records from a failed sync
- WHEN the user triggers sync after connectivity is restored
- THEN the queued records MUST be pushed successfully
- AND sync state MUST be marked "clean"

### Requirement: Authenticated Gateway

The system MUST NOT attempt Drive API calls unless a valid OAuth token exists. Unauthenticated sync attempts MUST display an actionable error directing the user to log in.

#### Scenario: Sync without auth

- GIVEN the user has not logged in
- WHEN the user triggers any sync operation
- THEN the system MUST reject the operation
- AND MUST display "Sign in with Google to enable sync"
