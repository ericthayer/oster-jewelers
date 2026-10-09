# Page blueprints

Default blueprints for a seven-page B2B services site, built from the components in this system. `brand-build` rewrites this file from the Pages section of `spec/client-spec.md`: the page list, audiences, primary actions, redirects and the client's open inputs. Home is built in every concept; the other pages follow the concept the client chooses.

Site-wide: SiteHeader and SiteFooter on every page; one label per intent (from `ctaIntents`); stable anchor IDs for deep links; 301 redirects from the live URLs.

## Home `/`

- **For**: every audience; route each to the right next step in one screen.
- **Sections**: Hero (concept variant) → services (ServiceIndex) → proof (FeatureSplit + reasons, or SpecPlate) → safety or quality teaser (FeatureSplit or SafetyRecord) → values (ValuesBand) → hire, join, partner (AudiencePaths) → Testimonial → FAQ → CTABand.
- **Primary action**: the quote intent.
- **Client inputs**: FAQ answers; reviews with permission to publish.

## About `/about/`

- **For**: partners, job seekers and buyers alike: who runs the company, how it works, where it is going.
- **Sections**: PageHeader → mission and mantra (FeatureSplit) → history (Timeline) → values (ValuesBand) → leadership (LeaderCard grid) → parent or sister companies (SpecPlate), if any → offices → AudiencePaths → CTABand.
- **Primary action**: the quote intent; secondary paths to Careers and Partner inquiry.
- **Client inputs**: founding year and milestones; leadership names, titles, bios and portraits; company relationships; any figures they want published.

## Services `/services/`

- **For**: buyers scoping work.
- **Sections**: PageHeader → overview (ServiceIndex) → one section per service with anchors `#service-one` to `#service-five` (FeatureSplit alternating with full-width SpecPlate rows: method, equipment, typical scope, service area) → how a project runs (Timeline as a process) → service areas → FAQ → CTABand.
- **Primary action**: the quote intent (the form preselects the service from the anchor).
- **Client inputs**: equipment and scope per service; typical project sizes; service area; photos for the shot list.

## Proof `/safety/`

- **For**: buyers who ask for the record first. Rename the page if the client's proof is quality, certifications or case studies rather than safety.
- **Sections**: PageHeader → commitment statement → SafetyRecord (the metrics the client publishes) → programs and training (BenefitList as a checklist) → field practices (Checks) → "Request our safety packet" (Notice + link to Contact with topic preset) → CTABand.
- **Primary action**: Request our safety packet.
- **Client inputs**: the metrics with year and source; certifications and memberships; whether to publish the numbers or share on request.

## Careers `/careers/`

- **For**: job seekers, mostly on phones.
- **Sections**: PageHeader → why work here (BenefitList) → roles and paths (AudiencePaths variant) → open roles (JobList from the job feed; embed variant if the plugin only offers an iframe) → hiring process (Timeline as steps) → FAQ → CTABand variant with the careers intent.
- **Primary action**: the careers intent, then apply on the applicant-tracking site.
- **Client inputs**: the job feed or plugin; benefits and pay practices; hiring steps; team photos and a quote from an employee (with permission).

## Partner inquiry `/partners/`

- **For**: subcontractors, suppliers or resellers who want to partner.
- **Sections**: PageHeader → who we partner with (Tag list) → requirements (SpecPlate) → why partner (BenefitList) → SubcontractorForm → what happens next (Timeline as steps) → contact block.
- **Primary action**: the partner intent.
- **Client inputs**: requirements and documents; prequalification steps; who reviews inquiries and how fast.

## Contact `/contact/`

- **For**: anyone ready to talk; the quote form lives here.
- **Sections**: PageHeader → contact methods (CallLink, email, after-hours Notice) → QuoteForm at `#quote` with a topic field → offices with map links → FAQ.
- **Primary action**: the quote intent.
- **Client inputs**: which inbox each topic routes to; office hours; after-hours line.

## Redirects from the live site

| Live URL | New URL |
| --- | --- |
| `/` | `/` |
| Client to provide | Client to provide |

## Open items for the client

`brand-build` copies every Owed row from the spec here.
