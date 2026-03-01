# Frontend Implementation Prompt: Worksheet Customization on Profile

Use this prompt when implementing the profile "Worksheet" section. Copy the entire section below and provide it to your frontend developer or AI assistant along with your codebase context.

---

## Context

- The app has a **My Profile** page that shows user info (name, email, school name, principal name, etc.) and an **Edit Profile** flow.
- The **backend** already supports:
  - **Watermark opacity** per user: stored in `worksheet_watermark_opacity` (0–1).
  - **Worksheet preview data**: school name, logo URL, and watermark opacity for the current user.
  - **Personalized worksheet PDFs**: when a user views/downloads a worksheet, the PDF includes a header (logo + school name) and a **watermark** (diagonal school name) whose **opacity** is the user’s `worksheet_watermark_opacity`.

## Goal

On the **My Profile** page, add a **Worksheet** section where the user can:

1. **Change the watermark opacity** (e.g. slider or input 0–100% or 0–1).
2. **See a preview** of how the worksheet header and watermark will look (so they understand the effect of their logo, school name, and opacity before downloading worksheets).

Requirements:

- The opacity value set here must be sent to the backend and stored; it is used when generating personalized worksheet PDFs.
- The preview is for illustration only (header + watermark mock), not a real PDF. Use the data from the profile/preview API to render a small mockup.

## Backend APIs (Already Implemented)

Base URL: same as your app (e.g. `http://localhost:4000` or your API base). All endpoints below require **authentication** (e.g. `Authorization: Bearer <token>`).

### 1. Get profile (includes worksheet data)

- **GET** `/api/auth/profile`
- **Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@gmail.com",
    "school_name": "Knowledge High School",
    "school_principal_name": "Mr. Smith",
    "logo": "http://localhost:4000/uploads/papers/logo/xxx.png",
    "worksheet_watermark_opacity": 0.3,
    "worksheet_preview": {
      "school_name": "Knowledge High School",
      "logo_url": "http://localhost:4000/uploads/papers/logo/xxx.png",
      "watermark_opacity": 0.3
    }
  }
}
```

- Use `user.worksheet_watermark_opacity` for the opacity control (0–1).
- Use `user.worksheet_preview` (or the same fields from `user`) to render the preview: `school_name`, `logo_url`, `watermark_opacity`.

### 2. Update profile (including watermark opacity)

- **PUT** `/api/auth/profile`
- **Content-Type:** `application/json` (and optionally `multipart/form-data` if also updating logo).
- **Body (JSON):** send only the fields you are updating, e.g.:
```json
{
  "worksheet_watermark_opacity": 0.5
}
```
- Valid range: `0` (nearly invisible) to `1` (fully opaque). Backend clamps to this range.
- **Response (200):** same shape as GET profile (`success`, `user` with updated `worksheet_watermark_opacity` and `worksheet_preview`).

### 3. Get worksheet preview data only (optional)

- **GET** `/api/auth/profile/worksheet-preview`
- Use this if you want to refresh only the preview data (e.g. after changing opacity) without refetching the full profile.
- **Response (200):**
```json
{
  "success": true,
  "preview": {
    "school_name": "Knowledge High School",
    "logo_url": "http://localhost:4000/uploads/papers/logo/xxx.png",
    "watermark_opacity": 0.3
  }
}
```

## Tasks to Implement

### 1. Add a “Worksheet” section on the Profile page

- Place it in a sensible spot (e.g. below “School Information” or in a separate card/section).
- Section title: e.g. **“Worksheet appearance”** or **“Worksheet header & watermark”**.

### 2. Watermark opacity control

- **Input:** A control that lets the user set opacity between 0 and 1 (or 0% and 100%). Examples:
  - Slider (range input) with optional number display.
  - Number input with min 0, max 1 (or 0–100 with division by 100 when sending to API).
- **Label:** e.g. “Watermark opacity” with short help text: “This opacity is used for the watermark on your downloaded worksheets.”
- **Behavior:**
  - On load: set the control value from `user.worksheet_watermark_opacity` (default 0.3 if missing).
  - On change: call **PUT** `/api/auth/profile` with `{ "worksheet_watermark_opacity": <value> }` (value in 0–1).
  - Optional: debounce or save on “Save” to avoid too many requests.
  - On success: update local state (and optionally refetch profile or worksheet-preview so the preview reflects the new opacity).

### 3. Preview of header and watermark

- **Purpose:** Show a small mock of how the worksheet header and watermark will look, using the same data the backend uses (school name, logo, opacity).
- **Data source:** Use `user.worksheet_preview` from GET profile (or from GET `/api/auth/profile/worksheet-preview`).
- **Preview content:**
  - **Header mock:**
    - A horizontal band (e.g. light cream/off-white background, optional border to match backend “Indian style”).
    - On the left: school logo image if `logo_url` is present (with max height so it doesn’t overflow).
    - Next to it (or centered if no logo): **school name** from `school_name`.
  - **Watermark mock:**
    - Below or over the header area, show the **school name** again (or “Your School” if no name) as diagonal/large text, with **opacity** = `watermark_opacity` (e.g. CSS `opacity: preview.watermark_opacity`).
- **Layout:** The preview can be a simple box (e.g. aspect ratio similar to a worksheet or a fixed height) so the user can see header + watermark at a glance. No need to generate a real PDF; a static mock is enough.

### 4. Loading and error handling

- While loading profile or saving opacity: show a loading state (e.g. disabled control, spinner).
- If PUT fails: show an error message (e.g. “Could not save watermark opacity”) and keep the previous value in the control.
- If GET profile fails: handle as your app already does for profile errors.

### 5. Optional enhancements

- **Save button:** If you use a single “Save” for the whole profile, include `worksheet_watermark_opacity` in the payload when the user clicks Save.
- **Live preview:** Update the preview as the user moves the opacity slider (without saving), and only call PUT when they release or click Save, to reduce API calls.
- **Accessibility:** Ensure the opacity control has a clear label and, if using a slider, an accessible name and optional visible value (e.g. “50%”).

## Summary checklist

- [ ] “Worksheet” (or “Worksheet appearance”) section added on the Profile page.
- [ ] Opacity control (0–1 or 0–100%) bound to `user.worksheet_watermark_opacity`.
- [ ] On opacity change (or on Save), PUT `/api/auth/profile` with `worksheet_watermark_opacity`.
- [ ] Preview area that shows:
  - [ ] Header mock: logo (if `logo_url`) + school name.
  - [ ] Watermark mock: school name (or “Your School”) with opacity from `watermark_opacity`.
- [ ] Preview data from `user.worksheet_preview` (or GET `/api/auth/profile/worksheet-preview`).
- [ ] Loading and error handling for profile and update.

## Notes

- Backend stores opacity as a float **0–1**. If you show “%” in the UI, convert (e.g. display `opacity * 100`, send `value / 100`).
- Logo in preview must come from `logo_url` (full URL). Use it in an `<img src={logo_url} />`; ensure your app allows the API origin if you have CSP or CORS restrictions for images.
- The actual personalized PDF (header + watermark with this opacity) is generated when the user views or downloads a worksheet via the worksheet flow; no change required there if the backend is already integrated.

---

*End of prompt.*
