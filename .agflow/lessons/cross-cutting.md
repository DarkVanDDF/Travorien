# Cross-cutting lessons

- Keep supplier-shaped mock records visibly tagged so demos cannot silently become truth.
- Treat natural language as intent input; the applied product output remains typed state.
- Validate both immutability and dependent recalculation for every trip repair.
- Separate world facts, assessed impact, projected choices, applied changes, and user
  decisions so lifecycle state cannot be confused with mutation state.
- Validate a multi-command plan completely before applying any command; atomic no-op
  failure is safer than partially repairing a structured aggregate.
- Keep signal normalization, canonical event compilation, Trip impact, and response
  policy as separate pure seams; registry dispatch should fail closed on zero or
  ambiguous matches.
- Event version and Trip revision are independent concurrency boundaries. Bind both to
  previews and regenerate candidates from current canonical state before mutation.
- Derive an outcome's expected metrics from the immutable decision snapshot. Accepting
  caller-supplied expectations would break the plan-to-observation audit chain.
- A live reality feed adapter does not make catalog price, inventory, availability, or
  routing authoritative; those facts need their own replaceable supplier boundary.
