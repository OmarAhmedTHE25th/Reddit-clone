-- Database-level invariants for the vote/counter engine.
ALTER TABLE "Post"
  ADD CONSTRAINT "post_ups_nonnegative" CHECK ("ups" >= 0),
  ADD CONSTRAINT "post_downs_nonnegative" CHECK ("downs" >= 0),
  ADD CONSTRAINT "post_score_matches_votes" CHECK ("score" = "ups" - "downs");

ALTER TABLE "Comment"
  ADD CONSTRAINT "comment_ups_nonnegative" CHECK ("ups" >= 0),
  ADD CONSTRAINT "comment_downs_nonnegative" CHECK ("downs" >= 0),
  ADD CONSTRAINT "comment_score_matches_votes" CHECK ("score" = "ups" - "downs");

ALTER TABLE "PostVote"
  ADD CONSTRAINT "post_vote_value_valid" CHECK ("value" IN (-1, 0, 1));

ALTER TABLE "CommentVote"
  ADD CONSTRAINT "comment_vote_value_valid" CHECK ("value" IN (-1, 0, 1));

-- Community names are unique case-insensitively (r/foo and r/Foo are the same).
CREATE UNIQUE INDEX "Community_name_lower_key" ON "Community" (lower("name"));
