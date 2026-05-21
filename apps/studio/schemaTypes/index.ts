import { author } from "./author";
import { blogComment } from "./blogComment";
import { blogReaction } from "./blogReaction";
import { category } from "./category";
import { changelogEntry } from "./changelogEntry";
import { page } from "./page";
import { post } from "./post";
import { showcase } from "./showcase";
import { siteSettings } from "./siteSettings";

export const schemaTypes = [
  post,
  blogComment,
  blogReaction,
  author,
  category,
  changelogEntry,
  page,
  showcase,
  siteSettings,
];
