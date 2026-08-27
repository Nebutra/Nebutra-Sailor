# image-pipeline Anti-Patterns

- Do not call generation without `BrandContext`.
- Do not let an agent write workflow JSON directly.
- Do not hardcode style text outside the shared brand contract.
- Do not mark model-backed image generation production-ready until sidecar
  lifecycle, model install, and license metadata are wired.
