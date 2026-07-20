CREATE TABLE "profile_deletions" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
