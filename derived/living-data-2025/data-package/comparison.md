# Data Package: 2025 → 2026

One 2025 symposium compared with selected moments from the 2026 conference. All connections below are interpretations grounded in caption passages. No causal influence is assumed, and unequal recording coverage prevents conference-wide trend claims.

The strongest development threads are GBIF’s validation work and Holly Little’s fossil vocabulary and publishing models. Profile governance, schema versioning and occurrence identifiers remain active questions in the selected 2026 talks. Other pairs illustrate parallel approaches or contrasts between projects, rather than a direct historical follow-up.

Mapped 14 items and 118 raw tags to 37 existing themes. Retained 8 unmapped tag occurrences with reasons. Compared all 14 items against metadata from 255 2026 items; the 12 comparisons below were selected for source review.

## Theme mapping

| 2025 item | Existing themes |
|---|---|
| Session introduction: what the Darwin Core Data Package is and how to read its publishing models | Darwin Core Data Package, Schema design and data modelling, Collection data models |
| From Observations to Interactions: iNaturalist and the Expanding Landscape of Biodiversity Data Sharing with DwC-DP | Citizen science, Darwin Core mapping and crosswalks, Identification provenance and uncertainty, Trait and phenology data, Data access control and licensing, Data provenance, Darwin Core Data Package |
| From Flat to Structured: Enhancing Natural History Collection Datasets in GBIF Using Darwin Core Data Packages | Data publishing and mobilisation, Digital extended specimen, Molecular and sequence data, Biobanks, seed banks and living collections, Persistent identifiers, Data quality assessment, Darwin Core mapping and crosswalks, Schema design and data modelling, Darwin Core Data Package |
| Modeling Complex Marine Survey Data Using the Darwin Core Data Package | Marine biodiversity data, Sampling-event and survey data, Darwin Core Data Package, Collection data models, Schema design and data modelling, Darwin Core mapping and crosswalks, Biodiversity indicators and policy reporting, Legacy data migration, Data publishing and mobilisation |
| From A To DP - DwC-DP Captures The Full Story Of A Citizen Science And DNA Metabarcoding Survey | Environmental DNA, Citizen science, Sampling-event and survey data, Darwin Core Data Package, Digital extended specimen, Identification provenance and uncertainty, Collection data models, Schema design and data modelling |
| Characterizing paleontological specimens for maximal alignment with global data practices | Palaeontology data, Collection data models, Geoscience and mineral collections, Digital extended specimen, Controlled vocabularies, Collection management systems, Capacity building and workforce, Darwin Core Data Package |
| Part 1 Q&A: effort, identifiers, complexity for users, Indigenous data, interactions, EML and extended specimens | Capacity building and workforce, Persistent identifiers, Schema design and data modelling, User-centred design, Data publishing and mobilisation, Indigenous data governance, Data packaging and exchange formats, Digital extended specimen, Data visualisation, Darwin Core Data Package |
| Darwin Core Data Package: A Practical Evolution to Support Richer, Deeper, and New Biodiversity Data Sharing | Standards development and governance, Schema design and data modelling, Data packaging and exchange formats, Collection data models, Identifying and crediting people, Controlled vocabularies, Darwin Core Data Package, Digital extended specimen |
| Two Decades of ABCD: Advancing Structured Biodiversity Data Sharing | Standards development and governance, Schema design and data modelling, Data packaging and exchange formats, Research infrastructure landscape, National and regional biodiversity data networks, Capacity building and workforce, Semantic interoperability, Darwin Core Data Package |
| Seamless Integration: How DiSSCo's openDS Facilitates Data Interoperability with the Darwin Core Data Package | Digital extended specimen, FAIR digital objects, Standards development and governance, Schema design and data modelling, Semantic interoperability, Persistent identifiers, Research infrastructure landscape, Darwin Core Data Package |
| Implementation Status of the Darwin Core Data Package (DwC DP) at GBIF | Data publishing and mobilisation, Data quality assessment, Standards development and governance, Data packaging and exchange formats, User-centred design, Data visualisation, Research software architecture, Darwin Core Data Package |
| Implementing the proposed DwC-DP format in GBIF: data publishing tools | User-centred design, Schema design and data modelling, Data visualisation, Darwin Core mapping and crosswalks, Darwin Core Data Package |
| Darwin Core Data Package public review process | Standards development and governance, Community engagement and outreach, Darwin Core Data Package |
| Part 2 Q&A: review participation, profiles, metabarcoding scale, nested assertions, projects and building expertise | Standards development and governance, Capacity building and workforce, Schema design and data modelling, Semantic interoperability, Environmental DNA, Data packaging and exchange formats, Trait and phenology data, Data provenance, Darwin Core Data Package |

The symposium is deliberately narrow. Its counts do not measure what became more or less popular across conferences. Proposed themes for organism interactions and export performance are retained separately; no existing theme IDs were renamed.

## Comparisons

### Public review → reported ratification

**Relationship:** same standard status change. **Review:** caption checked.

**2025:** Steve Baskauf describes the proposal as under an extended 90-day public review, open until at least 16 December. [Watch at 01:06:56.480](https://www.youtube.com/watch?v=sPsR0X69PsM&t=4016s).

**2026:** Federico Méndez reports that the conceptual model was ratified in May. He also says a later no-dissent period ended on 15 September and package-standard release was still expected. [Watch at 00:54:41](https://vimeo.com/1228900080/dc5cd998f4#t=3281s).

**Interpretation:** The recordings document a reported change from proposal review to ratification of the conceptual model.

**Limit:** These are historical statements in conference recordings. They do not independently verify the complete ratification history or imply that every implementation was in production.

### Versioning remains an engineering question

**Relationship:** question revisited. **Review:** caption checked.

**2025:** GBIF says it needs a versioning strategy to accommodate changes after public review. [Watch at 00:48:08.480](https://www.youtube.com/watch?v=sPsR0X69PsM&t=2888s).

**2026:** The GBIF presentation discusses how future releases of the schemas will require support for multiple versions. [Watch at 01:06:10](https://vimeo.com/1228900080/dc5cd998f4#t=3970s).

**Interpretation:** The same infrastructure is still working through the operational consequences of an evolving standard.

**Limit:** A recurring concern does not establish that no versioning work happened in between; the 2026 endpoint is a test-environment presentation.

### Validation: planned services → concrete checks

**Relationship:** same project implementation detail. **Review:** caption checked.

**2025:** GBIF proposes validation in publishing tools and a portal service for packages assembled elsewhere. [Watch at 00:47:11.200](https://www.youtube.com/watch?v=sPsR0X69PsM&t=2831s).

**2026:** The later presentation explains uniqueness, primary-key and referential-integrity checks, including failure when a referenced resource is missing. [Watch at 01:00:35](https://vimeo.com/1228900080/dc5cd998f4#t=3635s).

**Interpretation:** The 2026 talk supplies concrete validation behaviour for part of the earlier plan.

**Limit:** This does not establish delivery of every planned service or public production rollout. The second GBIF presenter’s identity is uncertain in the existing extraction; attribute the explanation to the presentation, not confidently to Mikhail Podolskiy.

### Fossil categories → a more specific vocabulary proposal

**Relationship:** same speaker and workstream. **Review:** caption checked.

**2025:** Holly Little says the fossil categorisation work is helping develop values for materialEntityType. [Watch at 00:58:08.720](https://www.youtube.com/watch?v=RH05GIF0xWk&t=3488s).

**2026:** Holly presents a vocabulary document and describes proposed first-level values with a more informal second level. [Watch at 00:15:45](https://vimeo.com/1227832622/bfc3d73016#t=945s).

**Interpretation:** This is a strong thread through the same speaker, term and paleontology workstream, with a more concrete vocabulary proposal in the later talk.

**Limit:** The 2026 proposal is still seeking feedback; the recordings do not demonstrate that the vocabulary was ratified or deployed everywhere.

### Collection readiness → differentiated publishing profiles

**Relationship:** same speaker partial response. **Review:** caption checked.

**2025:** Holly describes manual test datasets, gaps in collection-management systems and identifier requirements beyond current capacity. [Watch at 01:05:04.480](https://www.youtube.com/watch?v=RH05GIF0xWk&t=3904s).

**2026:** In the later paleo framework Holly recalls a mapping exercise “last year” and argues for different DwC-DP publishing profiles for different kinds of material. [Watch at 02:27:34](https://vimeo.com/1230142990/f375daa720#t=8854s).

**Interpretation:** The later talk develops a practical approach to heterogeneous fossil data rather than requiring one mapping for every specimen type.

**Limit:** The reference to last year supports continuity of the workstream, but does not identify this exact 2025 presentation. It does not establish that earlier software or identifier barriers have been solved.

### Profiles: a usability idea → a governance question

**Relationship:** question revisited. **Review:** caption checked.

**2025:** Mikhail Podolskiy proposes profiles/templates as manageable subsets of the model; the paleo example shown is explicitly made up. [Watch at 00:55:40.480](https://www.youtube.com/watch?v=sPsR0X69PsM&t=3340s).

**2026:** The 2026 discussion asks about registering and governing named profiles; John Wieczorek says profiles are not yet established as standard products and could be community-created and vetted. [Watch at 09:03:51](https://vimeo.com/1230142990/f375daa720#t=32631s).

**Interpretation:** The problem recurs at a different level: making the model usable versus recognising and governing shared profiles.

**Limit:** Local templates and draft community mappings are not the same thing as registered, standardised profiles. Do not read “no profiles” as proof that no prototypes or drafts existed.

### ABCD community support → a DWB mapping prototype

**Relationship:** related implementation example. **Review:** caption checked.

**2025:** Anton Güntsch welcomes relational data exchange through DwC-DP and says the BioCASe help desk will extend support to it. [Watch at 00:31:08.799](https://www.youtube.com/watch?v=sPsR0X69PsM&t=1868s).

**2026:** Tanja Weibulat shows mapping Diversity Workbench’s PostgreSQL tables to DwC-DP using the test IPT. [Watch at 07:35:26](https://vimeo.com/1230142990/f375daa720#t=27326s).

**Interpretation:** A later example shows practical exploration of DwC-DP in an ecosystem that previously published through ABCD/BioCASe.

**Limit:** Different presenters and projects are involved. This does not show that the earlier pledge caused this prototype, or that ABCD was abandoned.

### Identifiers: persistence concerns → occurrence derivation problems

**Relationship:** question revisited. **Review:** caption checked.

**2025:** Tim Robertson distinguishes persistent identifiers from keys that only join data within a dataset version. [Watch at 01:14:16.800](https://www.youtube.com/watch?v=RH05GIF0xWk&t=4456s).

**2026:** Jonas Grieb explains that material records are not occurrences and raises stable-ID and missing-event problems when material data is mobilised as occurrences. [Watch at 06:53:10](https://vimeo.com/1230142990/f375daa720#t=24790s).

**Interpretation:** The later case makes identifier stability concrete in publication from a collection-management system.

**Limit:** These are related identifier problems, not proof that DINA is a direct follow-up to the 2025 discussion; local join keys and global identifiers must remain distinct.

### Near-lossless mapping versus lossy exchange

**Relationship:** cross project contrast. **Review:** caption checked.

**2025:** Sam Leeflang reports that openDS and DwC-DP are closely aligned and little data is lost in transformation. [Watch at 00:41:34.240](https://www.youtube.com/watch?v=sPsR0X69PsM&t=2494s).

**2026:** Matthew Yoder says partial alignment is normal and exchange from TaxonWorks to DwC-DP is lossy. [Watch at 06:50:06](https://vimeo.com/1230142990/f375daa720#t=24606s).

**Interpretation:** Mapping quality depends on the source model and use case; this is a useful contrast between two projects.

**Limit:** Different systems are being compared. This is neither a regression from 2025 to 2026 nor evidence that either speaker contradicts their own earlier claims.

### Indigenous data concerns → related restriction vocabulary work

**Relationship:** related parallel work. **Review:** caption checked.

**2025:** The panel says DwC-DP usage policy does not yet solve Indigenous-data concerns and needs to evolve. [Watch at 01:23:51.600](https://www.youtube.com/watch?v=RH05GIF0xWk&t=5031s).

**2026:** Tania Laity’s restricted-data proposal includes First Nations cultural significance in its reasons vocabulary. [Watch at 01:23:16](https://vimeo.com/1229289729/f137d0855e#t=4996s).

**Interpretation:** The later talk provides related, concrete work on expressing reasons for restrictions.

**Limit:** This does not resolve the broader CARE, sovereignty or community-authority question. The 2026 speaker traces the task group to a 2023 workshop, so no causal origin in the 2025 discussion is inferred.

### Material derivation across two collection examples

**Relationship:** topical comparison. **Review:** caption checked.

**2025:** Jörg Holetschek shows the Berlin herbarium’s specimens, tissues and DNA samples as linked materials rather than disconnected exports. [Watch at 00:28:52.480](https://www.youtube.com/watch?v=RH05GIF0xWk&t=1732s).

**2026:** Jonas Grieb works through a bat specimen, tissue and molecular-extract chain using material derivation relationships. [Watch at 06:55:53](https://vimeo.com/1230142990/f375daa720#t=24953s).

**Interpretation:** Two institutions illustrate how the same modelling capability can express specimen-to-sample lineage.

**Limit:** This is a topical comparison of different datasets, not a demonstrated historical follow-up or evidence that DINA reused Berlin’s mapping.

### The conceptual model, presented with a design tool

**Relationship:** same speaker and standard. **Review:** caption checked.

**2025:** John Wieczorek describes the proposed conceptual model as a semantic layer for Darwin Core classes. [Watch at 00:04:14.720](https://www.youtube.com/watch?v=sPsR0X69PsM&t=254s).

**2026:** John demonstrates the Data Package Designer and generating a descriptor from selected tables. [Watch at 06:36:53](https://vimeo.com/1230142990/f375daa720#t=23813s).

**Interpretation:** The same speaker and standard connect a conceptual explanation with a concrete authoring demonstration in the later talk.

**Limit:** Tools already existed in 2025. This pair does not establish when the Designer was first built, or that authoring tools were absent before 2026.

## Questions to keep open

These are editorial follow-up prompts, not necessarily questions asked verbatim in either year.

- **How should shared profiles be registered and governed?** Revisited in the 2026 profile discussion; local/draft profiles must be distinguished from standard products. [2025 source](https://www.youtube.com/watch?v=sPsR0X69PsM&t=3340s).
- **How should identifier persistence and derived occurrences be handled?** Related stability and occurrence-derivation issues recur in DINA; a universal solution is not demonstrated. [2025 source](https://www.youtube.com/watch?v=RH05GIF0xWk&t=4456s).
- **How will GBIF support successive schema versions?** Still raised as an engineering issue by the same infrastructure in 2026. [2025 source](https://www.youtube.com/watch?v=sPsR0X69PsM&t=2888s).
- **How will Indigenous data authority and CARE be expressed?** A related restriction vocabulary is shown in 2026; broader governance needs remain unresolved by this comparison. [2025 source](https://www.youtube.com/watch?v=RH05GIF0xWk&t=5031s).
- **Will the model gain a project class?** No direct follow-up was established in this reviewed set. This is not evidence that the subject was absent from the conference or wider standards work. [2025 source](https://www.youtube.com/watch?v=sPsR0X69PsM&t=5182s).
- **Should assertions support nested assertions?** No direct follow-up was established in this reviewed set. Later trait modelling talks are not automatically answers to this specific structural question. [2025 source](https://www.youtube.com/watch?v=sPsR0X69PsM&t=4975s).

## Data and review

- `theme_mapping.json`: every raw-tag decision, its reason, and proposed missing themes.
- `content_items.json`: enriched copies of the pilot records with mapped themes; original extraction untouched.
- `candidate_links.json`: ranked suggestions, explicitly unreviewed.
- `comparison_decisions.json`: curated interpretation and evidence anchors.
- `comparison_links.json`: source passages, exact cue boundaries, video links and speaker uncertainty.
- `open_questions.json`: editorial questions with supporting source passages and comparison references.
- `themes.json`: shared theme IDs with separately scoped 2025/2026 membership and comparison links.
- `validation-report.json`: coverage, source hashes and limitations.

Regenerate from the repository root with `python3 source/living-data-2025/data-package/compare.py`. Site integration and the timeline interface remain separate work.
