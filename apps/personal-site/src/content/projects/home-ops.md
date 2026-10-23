---
type: "SoftwareSourceCode"
title: "home-ops"
description: "Kubernetes GitOps homelab using Talos Linux and FluxCD."
pubDate: 2026-03-02
startDate: "2026-09"
tags: ["homelab", "gitops"]
keywords: ["homelab", "gitops", "kubernetes", "talos", "fluxcd"]
draft: false
inLanguage: "en"
url: "https://github.com/LazyGeniusMan/home-ops"
codeRepository: "https://github.com/LazyGeniusMan/home-ops"
sameAs: []
programmingLanguage: ["go"]
author: ["andriyansyah"]
role: "Owner and operator"
outcome: "The whole homelab rebuilds from git, so no machine is special."
verificationStatus: "verified"
license: "https://www.apache.org/licenses/LICENSE-2.0"
disambiguatingDescription: "Date semantics: pubDate 2026-03-02 is the narrative publication anchor; dateCreated 2026-09-01 is the GitHub repo creation (repo reality, API-fetched); startDate September 2026 is the work-period anchor the timeline sorts on. Values differ, meanings do not conflict."
dateCreated: 2026-09-01
dateModified: 2026-09-29
---

## Problem

A homelab of hand-configured machines breaks the moment one disk or one forgotten manual step fails. Rebuilding from memory is slow and never reproduces the same system.

## Approach

home-ops runs Kubernetes via GitOps with Talos Linux and FluxCD: the desired state of the cluster lives in git, and automation converges the machines toward it. Personal Project. Kubernetes GitOps using Talos Linux and FluxCD. One direction only: `talos/` renders bare-metal machines (Day 0/1), `flux/` delivers platform and workloads (Day 2), and `projects/` supplies versioned Go services and charts that Flux deploys.

## Result

The homelab rebuilds from git instead of from memory. Configuration changes go through review like any other code, and the running cluster is the visible result of what is declared in the repository.

Source: [github.com/LazyGeniusMan/home-ops](https://github.com/LazyGeniusMan/home-ops). Personal project, ongoing.
