---
title: "A marketplace chart of accounts plus its AIS"
description: "CoA, accounting treatment, and functional specs for a marketplace AIS."
pubDate: 2023-09-10
tags: ["accounting", "erp"]
keywords:
  ["chart-of-accounts", "accounting-treatment", "marketplace", "ais", "functional-specification"]
author: ["andriyansyah"]
about: ["makers-marketplace-2022"]
aboutExperience: ["makers-designer-2022", "navcore-2023"]
mentions: ["business-process-management", "business-process-improvement", "information-systems"]
publisher: "andriyansyah"
inLanguage: "id"
draft: true
---

For a B2C marketplace startup at Makers Institute, I prepared the business process documentation, the chart of accounts, and the accounting treatment as one design, then carried them into functional specification documents and wireframes for the Accounting Information System.

## Events first, accounts second

Every account exists because a marketplace event demands it: orders, escrow holds, payouts, platform fees, refunds. Documenting the procurement and order processes first meant the chart of accounts enumerated real economic events instead of textbook headings, and each event type got its accounting treatment decided up front.

## Specs carry rules into the build

Functional specification documents and wireframes translated those treatments into something engineers could implement: field definitions, posting rules, and edge cases like partial refunds. Comprehensive test cases then verified the AIS application against business requirements and accounting standards, so compliance was demonstrated rather than asserted.

## Designed for new event types

Marketplaces keep adding payment methods, fee structures, and seller tiers. Because the chart derives from process events, each addition arrives as a new event type with a known treatment pattern instead of a restructuring. The same event-first approach later served crowdfunding and money-changer engagements at [PT Navcore Nextology](/experience/navcore-2023), where novel transaction types needed accounts that would survive audit.
