---
type: Decision
title: Personal Site Rules
x-ai-rulez:
  kind: rule
  id: Personal Site Rules
  domain: custom
  metadata:
    priority: critical
    activation: glob
    paths:
      - 'apps/personal-site/**'
---

- Always use terms that are ATS friendly in all pages and urls.
- Home page must be concise short single section landing page that contains responsive grid of astro content collection count summaries that are clickable and linked to each of summary list pages.
- Page for the person astro content collection item detail (andriyansyah.json) must use small portrait image and show all fields for the person and then show all its connection/relation item list. For connection/relation item list, it must not have no pagination and show a single image logo/icon asset and important data/information for each content item in the list (use responsive grid that fit to content width and group by category for skills section, use list that fit to content width for the others), the other data/information will show in the detail page, always show the single image asset, if the content collection item did not have it, use placeholder with matchinng color palete instead of empty/non-existent area. Use organization image asset for work experience, educations and credentials list, use its own image anything else. The page Must have filter by each of connection/relation to other astro content collection and date that applied to all connections/relations. Use range date picker for date fields and use combobox that allows to pick multiple value for connection/relation fields. Based on the applied filters, it must be able to render resume in new tab that shows page with ATS-friendly format.
- Pages that list single astro content collection group (e.g. list of blog post) must have pagination and filters. Must have filter by fields that are date and connection/relation to other astro content collection. Use range date picker for date fields and use combobox that allows to pick multiple value for connection/relation fields. Show a single image logo/icon asset and important data/information for each content item in the list, the other data/information will show in the detail page. Always show the single image asset, if the content collection item did not have it, use placeholder with matchinng color palete instead of empty/non-existent area. Use organization image asset for work experience, education and credentials list, use its own image anything else.
- Pages that show detail of single astro content collection item must show all the fields it has. The order for the detail page are: breadcrumbs, title, contents (field that are not relation/connection), navigation (next and previous), relations (field that are relation/connections, group by collection name vertically then use responsive grid for each collection name and make it clickable that linked to its detail page)
