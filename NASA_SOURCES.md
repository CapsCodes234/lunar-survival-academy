# NASA sources

The official [Junior Astronaut Mission Trainer Resources tab](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=resources) was checked on 15 November 2026. The following titles and URLs appeared in its Data & Resources section.

## NASA resources confirmed on the challenge list

| Official listing | Potential game use | Limits |
| --- | --- | --- |
| [Space Weather Database Of Notifications, Knowledge, Information (DONKI)](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | Use a dated archived solar energetic particle event as the basis of the Day 3 shelter decision. Show when and where the event was observed. | Keep the game's storm timing and risk points separate from the event record. An event listing alone cannot establish the dose received by this fictional crew. |
| [RadLab (OSDR Radiation Dosimetry Database)](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) | Show a dated example of a detector's measured radiation or dose rate in the Habitat science note, with the original unit. | Identify the instrument and platform. Measurements from a spacecraft or station describe that setting. |
| [NASA Open Science Data Repository (OSDR)](https://osdr.nasa.gov/bio/repo/) | Identify a plant experiment for the Greenhouse and connect one documented growth condition to the player's decision to maintain a crop. | Use the specific study, organism, and experimental conditions. The two-day lettuce schedule is a training simplification. |
| [NASA Open APIs](https://api.nasa.gov/) | Use the portal to locate or retrieve the DONKI source record. | Cite the underlying archived record as the scientific reference. |

One candidate for team review is DONKI’s [Auto-generated Space Weather Notification - SEP, 30 July 2026](https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/Alert/47880/1). Notification `20260730-AL-005` reports a GOES detection beginning at 18:45 UTC. The Day 3 message could use this observation to explain how instruments detect energetic particles and why a crew would prepare shelter. GOES observed particle flux near Earth. The alert supplies no dose estimate for a lunar outpost.

## Integration status

**Incomplete.** The team has yet to select and approve a specific archived event, measurement, or study for use in the game. Phase 3 uses a scripted Day 3 storm, fictional supplies, and a dimensionless risk score. Challenge-list verification establishes the source options available to the team. Meaningful use of a selected record and submission eligibility still need verification.

For the Day 3 storm, record the selected source title, permanent NASA URL or event ID, observation date and time, observing instrument or location when known, and the exact fact or measurement with its original units if applicable. Explain how that fact informs the shelter scenario. Display the record title, date, and explanation in the game and distinguish the archive record from the game’s risk score.

The storm text is in `src/core/events.js` and the facility notes are in `src/data/educationalContent.js`. The applicable note’s `nasaSource` remains empty until a record is integrated.
