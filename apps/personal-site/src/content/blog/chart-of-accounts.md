---
title: "A chart of accounts that lasts"
description: "Designing a CoA for a marketplace, from first sale to audit."
pubDate: 2024-11-20
tags: ["accounting", "bpmn"]
keywords: ["chart-of-accounts", "accounting-treatment", "marketplace", "ais"]
author: ["andriyansyah"]
about: ["makers-marketplace-2022"]
# Retrospective pattern: origin role first (Makers), publication-period role second (Navcore).
aboutExperience: ["makers-designer-2022", "navcore-2023"]
mentions: ["business-process-management", "business-process-improvement", "information-systems"]
publisher: "andriyansyah"
inLanguage: "id"
---

For a B2C marketplace startup at Makers Institute, I prepared the business process documentation, the chart of accounts, and the accounting treatment together, not as three documents but as one design.

## Accounts follow the process

Every account in the chart exists because a step in the process creates an economic event: orders, escrow holds, payouts, fees, refunds. When the account structure mirrors the process, the month-end close reads like a retelling of what the business did.

## Treatment before transactions

The accounting treatment was decided up front for each event type, so engineers building the Accounting Information System had rules to implement instead of guesses to make. Functional specification documents and wireframes carried those rules into the build, and test cases checked the application's alignment with business requirements and accounting standards.

## The test of time

Marketplaces add payment methods, fee structures, and seller tiers. A chart of accounts designed from the process absorbs those changes as new event types rather than as restructuring. The same approach served later work: functional requirements and accounting treatments for a crowdfunding platform, and for a money changer point of sales, at [PT Navcore Nextology](/experience/navcore-2023).

Design the accounts from the events, write the treatment before the code, and verify with test cases. The chart will outlast the quarter.
