# Stage 1 Drive Decision

## Purpose

Decide if and when Google Drive should enter Wovith without adding Drive code in the Stage 1 implementation.

## Options

### Option A: No Drive In Stage 1

Keep Stage 1 Calendar-only and validate whether daily clarity and meeting prep work without document context.

Pros:

- lowest permission and compliance risk
- fastest private-alpha path
- keeps product scope simple

Cons:

- meeting prep may feel underpowered
- document context remains manual

### Option B: User-Selected Files With Google Picker And `drive.file`

Use Google Picker and the narrow `drive.file` scope so the user chooses exactly which files Wovith can see.

Pros:

- clearer consent story
- avoids broad Drive scanning
- useful for private alpha if document context becomes essential

Cons:

- less automatic
- requires explicit user curation
- still needs careful source schema and persistence work

### Option C: Broad Drive Metadata With `drive.metadata.readonly`

Read broad Drive metadata to power document-context cells.

Pros:

- stronger automatic document context
- can support recent, stale, and related document signals

Cons:

- restricted Google scope
- higher verification and security burden
- higher privacy burden
- not appropriate as an incidental Stage 1 addition

## Recommendation

Do not implement Drive in Stage 1.

If document context is needed later, prefer Option B: user-selected files through Google Picker plus `drive.file`.

Avoid broad `drive.metadata.readonly` unless product value clearly justifies the restricted-scope burden.

## Research Summary

Google recommends narrow scopes where possible. `drive.file` gives users control over which files are shared with an app, and Google Picker can be used with `drive.file`. `drive.metadata.readonly` is a restricted Drive scope. Restricted-scope data stored or transmitted on servers can require a security assessment.

## Stage 1 Decision

Drive is not implemented in this coding pass.

## Preconditions Before Coding Drive

- explicit user consent copy
- source schema design
- redacted persistence tests
- no server transmission of restricted data
- mock E2E path
- manual security and privacy review
