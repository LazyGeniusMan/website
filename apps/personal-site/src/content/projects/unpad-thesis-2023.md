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
relatedExperience: ["business-process-analyst-2022"]
startDate: "2023-03"
role: "Author"
outcome: "Samsat tax-collection process modeled executable and verified against business and tax rules."
verificationStatus: "verified"
disambiguatingDescription: ""
---

## Problem

The yearly motor vehicle tax collection process at Samsat ran on paper-driven handoffs where value-adding steps, policy waits, and signature-only gates were indistinguishable. Automating that as-is flow would have fossilized the waste inside software.

## Approach

For Bachelor thesis at Universitas Padjadjaran, I identified and documented the as-is flow, redesigned it to remove dead steps, then built the executable Business Process Model and Notation model with eligibility and calculation rules in Decision Model and Notation decision tables, keeping the diagram readable while every rule stayed independently testable. The accounting treatment for the collection was determined alongside the model for compliance with tax laws, and comprehensive test cases verified the application's alignment with business requirements and tax regulations.

## Result

The collection process runs as an executable model the office can operate and developers can build from, with test cases proving the two match — the same executable-model discipline later delivery work relied on.

Source: [github.com/LazyGeniusMan/thesis](https://github.com/LazyGeniusMan/thesis). Bachelor thesis, 2023.
