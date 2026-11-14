# NASA sources

Official challenge:

https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/

Global Awards eligibility requires meaningful use of at least one qualifying NASA data source from that challenge's Resources section. This file is the place to record those sources. Do not invent titles, URLs, or measurements.

## Verification status: incomplete

On 14 November 2026, the official challenge page above was requested and the server returned HTTP 500. The Resources section could not be read, so no NASA dataset has been confirmed for this project.

A third-party summary of the challenge was also found during setup. It was not used as the source list. A teammate still needs to open the official page and copy the qualifying resources from there.

Until that check is done, every number in the game is a fictional training value. The colony does not claim to simulate a NASA measurement.

## What a teammate needs to do

1. Open the official challenge URL in a browser.
2. Read the Resources section.
3. Choose at least one qualifying NASA source.
4. Add one row to the table below for that source.
5. Connect it to a mechanic that already exists, such as the Day 3 solar radiation warning in `src/core/events.js`.
6. Say, in the game interface, which source the player is looking at and whether the numbers are simplified.

## Source record

| Official challenge URL | NASA source title | NASA source URL | Scientific concept supported | Game mechanic using that information | Simplifications or limitations | Status |
| --- | --- | --- | --- | --- | --- | --- |
| https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/ | Not verified | Not verified | Not verified | Not linked yet | Game values in `src/core/constants.js` are fictional balance numbers. | Incomplete. Confirm a source from the official Resources section. |

## Where teaching copy lives

Short notes for each building are in `src/data/educationalContent.js`. Each note has `nasaSource: null` and `sourceStatus: "unverified"`. Replace those fields only after the official source has been checked. The building panel already shows a line that a NASA source has not been linked yet.
