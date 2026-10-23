---
type: "SoftwareSourceCode"
title: "BPMS automation of yearly motor vehicle tax collection"
description: "Undergraduate thesis artifacts: executable BPMN/DMN model of the yearly motor vehicle tax collection process at Samsat."
pubDate: 2023-03-16
tags: ["thesis", "bpmn", "automation"]
keywords: ["thesis", "bpmn", "dmn", "tax-collection", "samsat", "executable-process"]
draft: false
inLanguage: "id"
url: "https://github.com/LazyGeniusMan/thesis"
codeRepository: "https://github.com/LazyGeniusMan/thesis"
sameAs: []
programmingLanguage: []
author: ["andriyansyah"]
provider: "unpad"
relatedExperience: ["makers-analyst-2022"]
startDate: "2023-03"
role: "Author and process modeler"
outcome: "Samsat tax-collection process modeled executable and verified against business and tax rules."
verificationStatus: "verified"
disambiguatingDescription: "Provider is unpad (undergraduate thesis examined at Universitas Padjadjaran; degree year-range 2018-2023 lives in the education entry), not makers-institute: the Makers analyst ground is captured via relatedExperience makers-analyst-2022 instead. Dates: pubDate 2023-03-16 is the final artifact push; startDate March 2023 is the repo creation month (created 2023-03-08); no endDate (single-month artifact snapshot). programmingLanguage stays []: the repo languages API returns empty, never inferred."
---

## Problem

The yearly motor vehicle tax collection process at Samsat ran on paper-driven handoffs where value-adding steps, policy waits, and signature-only gates were indistinguishable. Automating that as-is flow would have fossilized the waste inside software.

## Approach

Bachelor thesis at Universitas Padjadjaran, grounded in the Makers Institute analyst engagement on the same process. Identified and documented the as-is flow, redesigned it to remove dead steps, then built the executable Business Process Model and Notation model with eligibility and calculation rules in Decision Model and Notation decision tables, keeping the diagram readable while every rule stayed independently testable. The accounting treatment for the collection was determined alongside the model for compliance with tax laws, and comprehensive test cases verified the application's alignment with business requirements and tax regulations.

## Result

The collection process runs as an executable model the office can operate and developers can build from, with test cases proving the two match — the same executable-model discipline later delivery work relied on.

Source: [github.com/LazyGeniusMan/thesis](https://github.com/LazyGeniusMan/thesis). Bachelor thesis, 2023.
