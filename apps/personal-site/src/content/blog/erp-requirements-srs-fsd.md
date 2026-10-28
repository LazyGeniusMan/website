---
title: "From ERP interviews to SRS and FSD"
description: "Turning user interviews into an SRS and FSD for an ERP build."
pubDate: 2021-12-15
tags: ["erp", "requirements", "accounting"]
keywords: ["erp", "requirements", "srs", "fsd", "implementation"]
author: ["andriyansyah"]
about: ["gits-erp-implementation-2021"]
aboutExperience: ["gits-2021"]
mentions: ["information-systems", "business-process-management", "sql"]
publisher: "andriyansyah"
inLanguage: "id"
draft: true
---

As an intern on the implementation team at [GITS Indonesia](https://gits.id), I learned that an ERP system succeeds or fails before a single table is created: in the requirements. My work was gathering what users actually needed and writing it down so developers could build it.

## Interviews first, diagrams second

The work started with interviews and document analysis: sitting with users, tracing how work moved between desks, and documenting the as-is process with flowchart diagrams. Only then did the data modeling begin, with entity-relationship diagrams designed alongside back-end developers and wireframes sketched with front-end developers.

## Two documents carry the build

The Software Requirement Specification captured what the system must do, written with technical writers so every requirement was testable. The Functional Specifications Document went further, describing how each function should behave. A Standard Operating Procedure gave users the day-one manual, and verification sessions with users checked the built system against the business process before sign-off.

What stayed with me: specifications are a promise between users and builders. The SRS holds the promise, the FSD details it, and verification proves it was kept. Every later engagement, from marketplace accounting systems to freelance backends, reused that same spine of interview, specify, verify.
