# Watermark Size and Text Bend – Frontend Reference

Backend supports user-controlled **watermark text size**, **watermark logo size**, and **watermark text bend** (rotation). These are returned in profile and worksheet-preview APIs and can be updated via **PUT** `/api/auth/profile`.

## Fields

| Field | Type | Range / Values | Default | Description |
|-------|------|----------------|---------|-------------|
| `worksheet_watermark_text_size` | number | 0.5 – 2 | 1.0 | Scale factor for watermark text size (1 = default font size). |
| `worksheet_watermark_logo_size` | number | 0.5 – 2 | 1.0 | Scale factor for watermark image/logo size when type is `image` or `text_and_image`. |
| `worksheet_watermark_text_bend` | number | -90 – 90 | -35 | Rotation of watermark text/image in degrees. -35 = diagonal; 0 = horizontal. |

## Where they appear

- **GET** `/api/auth/profile`  
  - On `user`: `worksheet_watermark_text_size`, `worksheet_watermark_logo_size`, `worksheet_watermark_text_bend`.  
  - Inside `user.worksheet_preview`: `watermark_text_size`, `watermark_logo_size`, `watermark_text_bend`.

- **GET** `/api/auth/profile/worksheet-preview`  
  - In `preview`: `watermark_text_size`, `watermark_logo_size`, `watermark_text_bend`.

- **PUT** `/api/auth/profile`  
  - Optional body fields: `worksheet_watermark_text_size`, `worksheet_watermark_logo_size`, `worksheet_watermark_text_bend`.  
  - Invalid values return **400** with an error message.

## UI suggestions

- **Text size / Logo size:** Slider from 0.5 to 2, or labeled steps (e.g. Small / Medium / Large).  
- **Text bend:** Slider from -90 to 90, or preset angles (e.g. -45°, -35°, 0°). Use `transform: rotate(<watermark_text_bend>deg)` in the preview for the watermark text.

Full worksheet customization (opacity, type, text, sizes, and bend) is described in **FRONTEND_PROMPT_WORKSHEET_PROFILE.md**.
