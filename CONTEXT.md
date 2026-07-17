# Open Emirates Intelligence

An evidence layer that makes official UAE open data queryable without overstating what a source can prove.

## Language

**Official Source**:
A government-owned portal, API, or published file registered with its citation and access status.
_Avoid_: Provider, feed

**Observed Sample**:
The bounded set of records returned for one request. It is not a population total unless upstream coverage proves completeness.
_Avoid_: Total, market size

**Industry Atlas**:
An evidence-backed view of observed UAE industrial establishments, areas, products, and emirates from the official industrial-license source.
_Avoid_: Business Atlas, investment ranking

**Industrial Establishment**:
One record in the official industrial-license source. A record is not assumed to represent a currently operating factory without source evidence.
_Avoid_: Company, factory

**Evidence Slice**:
A filtered view derived from an Observed Sample, retaining its source, methodology, limitations, and citation.
_Avoid_: Insight, recommendation

**Open Data Incident**:
A measured transition from a reachable official source to an unreachable state, bounded by stored observations.
_Avoid_: Outage claim
