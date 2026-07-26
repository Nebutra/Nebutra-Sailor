# Brand Guidelines

This document outlines how you may and may not use the brand assets (name, logos, icons, visuals) of Nebutra and Nebutra Sailor.

## General Principle

You are free to use the open-source code to build your own SaaS, products, or services. However, you **must use your own brand identity**. You cannot confuse users into thinking your product is the official Nebutra or is officially endorsed by us.

## ❌ You may NOT:

- **Use the Nebutra logo or icons for your own product.** If you fork or clone this repository to build a SaaS, you must replace the logos and brand visuals with your own.
- **Use the project name in your product branding.** Do not name your product "Nebutra Cloud", "YourSaaS powered by Nebutra Sailor", or similar variants that imply official association.
- **Use our specific marketing UI assets.** The illustrations and brand visuals in `/apps/landing/public` and `/packages/design/brand/assets` are our property. Do not use them as the visual identity of your own landing page.
- **Impersonate the official service.** Your application, website, and promotional materials must look distinctly different from the official Nebutra products.
- **Sell the exact template using our brand.** If you create a SaaS template or boilerplate based on this project, you must completely strip out the Nebutra branding.

## ✔️ You may:

- **Use the code.** You can use, modify, and distribute the underlying source code in accordance with the FSL-1.1-ALv2 license (and, two years after each release, the Apache-2.0 future license).
- **Modify the UI.** You are encouraged to customize the UI and build your own unique design on top of our components.
- **Mention the project for reference.** You can say "This project was built using Nebutra Sailor" or "Based on the open-source Nebutra Sailor project" in a descriptive, non-trademark sense.
- **Use the name in tutorials or tech talks.** You are well within your rights to mention "Nebutra Sailor" in educational content, blog posts, and technical discussions.

## Building a SaaS or Template based on Sailor?

If you are cloning this repository to build your own SaaS or offer a SaaS template:
1. **Change the logos**: Replace files in `/packages/design/brand/assets` and `/apps/landing/public` with your own.
2. **Change the name**: Update the project name in `package.json`, environment variables, and UI text to your own brand name.
3. **Change the colors/theme**: While not strictly required by trademark law, it helps ensure your project doesn't look like an imposter.

We love seeing what you build with the code! Just make sure it looks like *your* product, not *ours*.
