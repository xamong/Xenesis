# Auto-Layout And Layer Recipes

Use these recipes for polished screens that need layered heroes, app shells,
responsive-looking bands, and dense dashboards. Auto-layout properties can make a
screen easier to maintain, but the shared contract still requires stable root
dimensions and concrete component bounds.

## Auto-Layout Basics

Use `al` on panels when the renderer supports structured layout:

- `direction`: `vertical` or `horizontal`.
- `gap`: spacing between children.
- `padding`: inner spacing.
- `alignItems`: cross-axis alignment.
- `justifyContent`: main-axis distribution.
- `width "100%"` or fixed width for children inside an auto-layout container.
- `autoHeight true` for content sections that naturally grow.
- `minHeight`, `maxHeight`, and `fixedHeight` when the result must stay stable.

Practical pattern:

- Build the outer screen with fixed positions.
- Use `al` inside cards, forms, feed rows, or sections where child spacing matters.
- Do not mix absolute children and auto-layout children in the same container
  unless the example clearly shows that pattern.

## Layered Hero Pattern

Use `stackMode "layers"` when multiple children intentionally occupy the same
space, such as a background image plus overlay copy and CTA. Layered children
often use:

- `layerZ` for stacking order.
- `layerAlignItems` and `layerJustifyContent` for foreground placement.
- `layerPadding` for inset content.
- `style` for gradients, shadows, opacity, and backdrop effects.

Always keep foreground text readable with a dark overlay, solid panel, or strong
contrast. Do not place hero text directly over a busy image without protection.

## Layered Hero Example

```xcon-sketch
screen "Layered Hero" 402x812 bg @surface
  hero: panel at 20 24 362 260
    radius 26
    clip true
    al
      stackMode "layers"

    photo: image "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80" at 0 0 362 260
      objectFit cover
      layerZ 0

    shade: shape at 0 0 362 260
      bg "rgba(2,6,23,0.44)"
      layerZ 1

    copy: panel at 0 0 362 260
      bg transparent
      layerZ 2
      layerAlignItems stretch
      layerJustifyContent end
      layerPadding 24
      title: label "Weekend stays" at 24 124 250 36
        color white
        font
          size 30
          weight 900
      subtitle: label "Curated homes near the water" at 24 164 260 24
        color #e2e8f0
      cta: button "Explore" at 24 202 116 42
        bg white
        color #0f172a
        radius 21
```

## Dashboard Band Example

```xcon-sketch
screen "Dense Band" 900x360 bg @surface
  stats: panel at 24 24 852 112
    bg @surface2
    radius 18
    al
      direction horizontal
      gap 14
      padding 16
    cardA: panel at 0 0 260 80
      bg @surface
      radius 14
    cardB: panel at 0 0 260 80
      bg @surface
      radius 14
    cardC: panel at 0 0 260 80
      bg @surface
      radius 14
```

## Pitfalls

- Do not use auto-layout as a substitute for screen sizing.
- Layering is for intentional overlap only; ordinary screens should use normal
  vertical or horizontal composition.
- If a child can grow, give it a maximum size or ensure surrounding content still
  fits the screen.
