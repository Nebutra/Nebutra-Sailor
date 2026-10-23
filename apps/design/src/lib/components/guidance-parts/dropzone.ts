export const guidance: import("../guidance").Guidance = {
  keyboard: [
    {
      keys: ["Tab", "Shift + Tab"],
      does: "Moves focus to and from the zone. The hidden file input takes focus and the surface draws the ring. A disabled zone is skipped.",
    },
    {
      keys: ["Enter", "Space"],
      does: "Opens the operating-system file picker.",
    },
    {
      keys: ["Ctrl + V", "Cmd + V"],
      does: "With paste on, adds files from the clipboard while focus is in the zone.",
    },
  ],
  a11y: [
    {
      title: "A real file input, not a div",
      body: "The surface is a label around a visually hidden input type=file, so screen readers announce a file control and a form submits it by name.",
    },
    {
      title: "Rejections are announced",
      body: "Validation messages and the error prop render in a polite live region and set aria-invalid and aria-describedby on the input. When there is nothing to report the region is visually hidden.",
    },
    {
      title: "A custom body needs its own name",
      body: "children replaces the default label and description. The description prop is only linked to the input in the default body, so put the name and the hint in your own content.",
    },
    {
      title: "Progress needs a name",
      body: "The progress bar is named by progressLabel, which defaults to Upload progress. Pass the file name or a translated string.",
    },
  ],
  dos: [
    {
      title: "State the limits up front",
      body: "Put the accepted types and size in description, and enforce them with accept and maxSize.",
      code: '<Dropzone accept="image/png,image/jpeg" maxSize={5 * 1024 * 1024} description="PNG or JPG, up to 5 MB" onFiles={upload} />',
    },
    {
      title: "Translate the copy",
      body: "label, description, progressLabel and messages all default to English or take your strings.",
      code: "<Dropzone label={t('drop')} messages={{ type: (file) => t('badType', file.name) }} onFiles={upload} />",
    },
    {
      title: "Show upload progress",
      body: "Pass a number for a known percentage and null while the size is unknown. Omit it to hide the bar.",
      code: "<Dropzone progress={uploading ? percent : undefined} onFiles={upload} />",
    },
  ],
  donts: [
    {
      title: "Do not treat accept as security",
      body: "It checks names and MIME types in the browser. Validate the file again on the server.",
    },
    {
      title: "Do not put buttons or links in children",
      body: "The whole surface is one label for the file input. Interactive content nested inside it makes two controls compete for the same click and the same name.",
    },
    {
      title: "Do not use maxFiles without multiple",
      body: "Without multiple only one file is taken, whatever maxFiles says.",
    },
  ],
};
