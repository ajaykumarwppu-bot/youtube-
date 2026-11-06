// Creator Studio — Videos section types
// "Videos" tab = channel ke aaj tak ke saare videos ka pura data (YouTube Studio style)
// Status flow: processing (script/render chal raha) → scheduled → uploaded | failed

export type VideoStatus = "uploaded" | "scheduled" | "processing" | "failed";
export type VideoKind = "long" | "short";

export interface MetricPoint {
  day: string; // "24 Oct" type label
  value: number;
}

export interface RetentionPoint {
  t: string; // "4:30" — video ke kitne minute par
  pct: number; // kitne % viewers abhi bhi dekh rahe hain
}

// pipeline ke ek stage me kaunsi skills (kaunse version) use hui
export interface StageSkill {
  stage: string; // "Research", "Script", "Thumbnail"…
  skills: { name: string; version: string }[];
}

// Brain ke Experiments section se kaunsa experiment/technique is video me apply hua
export interface ExperimentUsage {
  title: string; // experiment/report ka naam
  technique: string; // kaunsi technique is video me use hui
}

// seo_prep stage ka output — video ke saath upload hone wala pura written package
// (Video Detail me Script se pehle "Upload Package" section isi se banta hai)
export interface VideoChapter {
  time: string; // "0:00" type timestamp
  label: string; // chapter ka naam
}

export interface VideoPackaging {
  title: string; // final title jo upload hui (packaging stage me lock hua)
  titleNote: string; // kis angle/reason se ye title likha (packaging stage ka decision)
  description: string; // YouTube description (multi-line)
  tags: string[]; // search tags
  hashtags?: string[]; // # wale hashtags (title/description ke liye)
  chapters?: VideoChapter[]; // sirf long videos (shorts me chapters nahi hote)
  endScreen?: string; // end screen plan (videos + subscribe)
  pinnedComment?: string; // upload ke baad pin hone wala comment
}

export interface VideoMetrics {
  views: number;
  impressions: number;
  ctr: number; // %
  likes: number;
  comments: number;
  subsGained: number;
  shares: number;
  watchHours: number;
  avgViewDuration: string; // "4:32"
}

export interface VideoRecord {
  id: string;
  title: string;
  topic: string; // video kis topic par hai + 1-line context
  kind: VideoKind;
  status: VideoStatus;
  duration: string; // "14:22" ya "0:52"
  hue: number; // deterministic gradient thumbnail/player
  script: string; // agent ki likhi script (markdown)

  // uploaded
  publishedAt?: string;
  metrics?: VideoMetrics;
  impressionsSeries?: MetricPoint[];
  ctrSeries?: MetricPoint[];
  retentionCurve?: RetentionPoint[];

  // scheduled — is time par upload hoga
  scheduledFor?: string;

  // processing — abhi kya chal raha hai
  progress?: { stage: string; pct: number; note?: string };

  // failed — system ne auto-detect karke Failed category me daala
  failReason?: string;
  failedStage?: string;
  failedAt?: string;

  // build info
  pipeline: StageSkill[];
  experiments: ExperimentUsage[];

  // upload package — seo_prep stage ne kya-kya ready kiya (processing/failed me abhi nahi hoga)
  packaging?: VideoPackaging;
}

export interface VideosState {
  videos: VideoRecord[];
}
