---
type: "SoftwareSourceCode"
title: "turutan"
description: "Personal project template lifecycle management."
pubDate: 2026-04-18
startDate: "2026-10"
tags: ["templates", "lifecycle"]
keywords: ["templates", "lifecycle", "cli", "go", "scaffolding"]
draft: false
inLanguage: "en"
url: "https://github.com/LazyGeniusMan/turutan"
codeRepository: "https://github.com/LazyGeniusMan/turutan"
sameAs: []
programmingLanguage: ["go"]
author: ["andriyansyah"]
role: "Maintainer"
outcome: "New projects start from one reviewed template instead of scattered copies."
verificationStatus: "verified"
license: "https://www.apache.org/licenses/LICENSE-2.0"
disambiguatingDescription: ""
dateCreated: 2026-10-08
dateModified: 2026-10-18
---

## Problem

Starting a new project meant copying an existing entry and cleaning up the parts that did not fit. Each copy drifted further from the last, so fixes in one place never reached the others.

## Approach

turutan treats the project template as a lifecycle of its own: author the template once, generate projects from it, and carry template updates back into generated projects. Personal Project. Project template lifecycle management. The template is versioned, so every project knows where it came from. The CLI ships as Go code (`go install github.com/LazyGeniusMan/turutan/cmd/turutan`) with a registry workflow — init a registry, cut a template release, then `check`, `diff`, and `update` generated projects against the released version.

## Result

New personal projects now start from one reviewed template. Improvements to the template are deliberate changes in one place rather than folklore spread across copies.

Source: [github.com/LazyGeniusMan/turutan](https://github.com/LazyGeniusMan/turutan). Personal project, ongoing.
