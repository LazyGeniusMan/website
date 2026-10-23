---
title: "ProcessMaker on Docker in a campus VPS"
description: "Multi-instance ProcessMaker on Docker, budgeted for a campus server."
pubDate: 2022-08-12
tags: ["bpmn", "automation"]
keywords: ["processmaker", "docker", "vps", "bpm-education", "automation"]
author: ["andriyansyah"]
about: ["processmaker-vps-2022"]
# Dual-link: setup during teaching-2022 (VPS/Docker), supervision continued teaching-2023.
# PubDate Aug 2022 sits in teaching-2022; teaching-2023 is a forward pointer to the continuation.
aboutExperience: ["teaching-2022", "teaching-2023"]
mentions: ["business-process-management", "bpmn"]
publisher: "andriyansyah"
inLanguage: "id"
---

As a teaching assistant for the Business Process Management course at [FEB Unpad](https://feb.unpad.ac.id), my job was making automation tangible: students needed a real ProcessMaker environment to deploy their models, not screenshots of one. That meant budgeting, provisioning, and maintaining a cloud VPS the course could afford.

## Budget first, then provision

Campus money is finite, so the work started with a monthly budget for a cost-effective VPS matched to the course requirements: enough memory for concurrent student instances, enough disk for process data, nothing more. The constraint shaped every later decision.

## One host, many instances

The VPS ran a multi-instance ProcessMaker deployment in Docker containers: each instance isolated, each student team able to break their own environment without touching their classmates'. Setup, hardening, and maintenance fell to me, alongside written and visual course materials on implementing process automation with ProcessMaker.

## Teaching is operations

A classroom platform is production infrastructure with a semester-long uptime target and a hundred impatient users. Keeping those containers healthy through the term taught more about the gap between a modeled process and a running one than any lecture could, and the Docker patterns for isolated, reproducible deployments reused later in freelance VPS work.
