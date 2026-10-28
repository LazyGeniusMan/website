---
type: "SoftwareSourceCode"
title: "home-ops"
description: "Kubernetes GitOps homelab using Talos Linux and FluxCD."
pubDate: 2026-03-02
startDate: "2026-09"
tags: ["homelab", "gitops"]
keywords: ["homelab", "gitops", "kubernetes", "talos", "fluxcd", "ansible", "terraform"]
draft: false
inLanguage: "en"
url: "https://github.com/LazyGeniusMan/home-ops"
codeRepository: "https://github.com/LazyGeniusMan/home-ops"
sameAs: []
programmingLanguage: ["go", "ansible", "terraform"]
author: ["andriyansyah"]
role: "Maintainer and operator"
outcome: "The whole homelab rebuilds and synced from git repository."
verificationStatus: "verified"
license: "https://www.apache.org/licenses/LICENSE-2.0"
disambiguatingDescription: "Personal project"
dateCreated: 2026-09-01
dateModified: 2026-09-29
---

## Problem

A homelab of hand-configured machines breaks the moment one disk or one forgotten manual step fails. Rebuilding from memory is slow and hard to reproduces the same system.

## Approach

home-ops runs Kubernetes via GitOps with Talos Linux and FluxCD, the desired state of the cluster lives in git repostory, and automation converges the machines toward it. Day 0 is using ansible to install talos on bare metal machines. Day 1 is using Terraform to bootstrap FluxCD. Day 2 is using FluxCD to do continues deployments for the clusters.

## Result

The homelab rebuilds from git instead of from memory. Configuration changes go through review like any other code, and the running cluster is the visible result of what is declared in the repository.

Source: [github.com/LazyGeniusMan/home-ops](https://github.com/LazyGeniusMan/home-ops). Personal project, ongoing.
