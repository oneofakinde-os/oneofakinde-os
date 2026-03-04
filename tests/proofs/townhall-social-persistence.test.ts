import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { GET as getLibraryRoute } from "../../app/api/v1/library/route";
import { GET as getTownhallSocialRoute } from "../../app/api/v1/townhall/social/route";
import { POST as postTownhallCommentRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/route";
import { POST as postTownhallCommentAppealRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/[comment_id]/appeal/route";
import { POST as postTownhallCommentHideRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/[comment_id]/hide/route";
import { POST as postTownhallCommentRestrictRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/[comment_id]/restrict/route";
import { POST as postTownhallCommentDeleteRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/[comment_id]/delete/route";
import { POST as postTownhallCommentReportRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/[comment_id]/report/route";
import { POST as postTownhallCommentRestoreRoute } from "../../app/api/v1/townhall/social/comments/[drop_id]/[comment_id]/restore/route";
import { POST as postTownhallLikeRoute } from "../../app/api/v1/townhall/social/likes/[drop_id]/route";
import { POST as postTownhallSaveRoute } from "../../app/api/v1/townhall/social/saves/[drop_id]/route";
import { POST as postTownhallShareRoute } from "../../app/api/v1/townhall/social/shares/[drop_id]/route";
import { GET as getWorkshopModerationQueueRoute } from "../../app/api/v1/workshop/moderation/comments/route";
import { POST as postWorkshopModerationResolveRoute } from "../../app/api/v1/workshop/moderation/comments/[drop_id]/[comment_id]/resolve/route";
import { commerceBffService } from "../../lib/bff/service";
import type { TownhallDropSocialSnapshot } from "../../lib/domain/contracts";

function createIsolatedDbPath(): string {
  return path.join("/tmp", `ook-bff-townhall-social-${randomUUID()}.json`);
}

function withRouteParams<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return {
    params: Promise.resolve(params)
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function socialForDrop(
  map: Record<string, TownhallDropSocialSnapshot>,
  dropId: string
): TownhallDropSocialSnapshot {
  const social = map[dropId];
  assert.ok(social, `expected social snapshot for ${dropId}`);
  return social;
}

test("proof: townhall social actions persist via bff routes", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const session = await commerceBffService.createSession({
    email: `townhall-social-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const reporterSession = await commerceBffService.createSession({
    email: `townhall-social-reporter-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const creatorSession = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });

  const drop = (await commerceBffService.listDrops())[0];
  assert.ok(drop, "expected at least one drop");

  const socialBaseResponse = await getTownhallSocialRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social?drop_ids=${encodeURIComponent(drop.id)}`)
  );
  assert.equal(socialBaseResponse.status, 200);
  const socialBasePayload = await parseJson<{
    social: { byDropId: Record<string, TownhallDropSocialSnapshot> };
  }>(socialBaseResponse);
  const baseline = socialForDrop(socialBasePayload.social.byDropId, drop.id);

  const unauthorizedLikeResponse = await postTownhallLikeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/likes/${drop.id}`, {
      method: "POST"
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(unauthorizedLikeResponse.status, 401);

  const likeResponse = await postTownhallLikeRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/likes/${drop.id}`, {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(likeResponse.status, 200);
  const likePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(likeResponse);
  assert.equal(likePayload.social.likedByViewer, true);
  assert.equal(likePayload.social.likeCount, baseline.likeCount + 1);

  const commentBody = "townhall social persistence proof comment";
  const commentResponse = await postTownhallCommentRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        body: commentBody
      })
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(commentResponse.status, 201);
  const commentPayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(commentResponse);
  assert.equal(commentPayload.social.commentCount, baseline.commentCount + 1);
  assert.equal(commentPayload.social.comments[0]?.body, commentBody);
  assert.equal(commentPayload.social.comments[0]?.authorHandle, session.handle);
  assert.equal(commentPayload.social.comments[0]?.visibility, "visible");
  assert.equal(commentPayload.social.comments[0]?.parentCommentId, null);
  assert.equal(commentPayload.social.comments[0]?.depth, 0);
  assert.equal(commentPayload.social.comments[0]?.replyCount, 0);
  assert.equal(commentPayload.social.comments[0]?.canModerate, true);
  assert.equal(commentPayload.social.comments[0]?.canReport, false);
  assert.equal(commentPayload.social.comments[0]?.canAppeal, false);
  assert.equal(commentPayload.social.comments[0]?.appealRequested, false);
  const createdCommentId = commentPayload.social.comments[0]?.id;
  assert.ok(createdCommentId, "expected created comment id");

  const replyBody = "replying in threaded mode";
  const replyResponse = await postTownhallCommentRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": reporterSession.sessionToken
      },
      body: JSON.stringify({
        body: replyBody,
        parentCommentId: createdCommentId
      })
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(replyResponse.status, 201);
  const replyPayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(replyResponse);
  assert.equal(replyPayload.social.commentCount, baseline.commentCount + 2);
  const createdReply = replyPayload.social.comments.find((entry) => entry.body === replyBody);
  assert.ok(createdReply, "expected threaded reply in social snapshot");
  assert.equal(createdReply?.depth, 1);
  assert.equal(createdReply?.parentCommentId, createdCommentId);

  const parentWithReplyCount = replyPayload.social.comments.find((entry) => entry.id === createdCommentId);
  assert.equal(parentWithReplyCount?.replyCount, 1);

  const reportResponse = await postTownhallCommentReportRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/report`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": reporterSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(reportResponse.status, 201);
  const reportPayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(reportResponse);
  assert.equal(reportPayload.social.comments[0]?.reportCount, 1);

  const forbiddenHideResponse = await postTownhallCommentHideRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/hide`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": reporterSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(forbiddenHideResponse.status, 403);

  const hideResponse = await postTownhallCommentHideRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/hide`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": creatorSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(hideResponse.status, 200);
  const hidePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(hideResponse);
  assert.equal(hidePayload.social.commentCount, baseline.commentCount + 1);
  const creatorComment = hidePayload.social.comments.find((entry) => entry.id === createdCommentId);
  assert.ok(creatorComment, "expected creator moderator view of hidden comment");
  assert.equal(creatorComment?.visibility, "hidden");
  assert.equal(creatorComment?.canModerate, true);
  assert.equal(creatorComment?.canAppeal, false);

  const appealResponse = await postTownhallCommentAppealRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/appeal`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": session.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(appealResponse.status, 201);
  const appealPayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(appealResponse);
  const appealedComment = appealPayload.social.comments.find((entry) => entry.id === createdCommentId);
  assert.ok(appealedComment, "expected hidden comment in appeal response");
  assert.equal(appealedComment?.appealRequested, true);
  assert.equal(appealedComment?.canAppeal, false);

  const moderationQueueResponse = await getWorkshopModerationQueueRoute(
    new Request("http://127.0.0.1:3000/api/v1/workshop/moderation/comments", {
      headers: {
        "x-ook-session-token": creatorSession.sessionToken
      }
    })
  );
  assert.equal(moderationQueueResponse.status, 200);
  const moderationQueuePayload = await parseJson<{
    queue: Array<{
      commentId: string;
      reportCount: number;
      appealRequested: boolean;
      parentCommentId: string | null;
    }>;
  }>(moderationQueueResponse);
  const queueEntry = moderationQueuePayload.queue.find((entry) => entry.commentId === createdCommentId);
  assert.ok(queueEntry, "expected appealed comment in moderation queue");
  assert.equal(queueEntry?.reportCount, 1);
  assert.equal(queueEntry?.appealRequested, true);

  const forbiddenResolveResponse = await postWorkshopModerationResolveRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/workshop/moderation/comments/${drop.id}/${createdCommentId}/resolve`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": reporterSession.sessionToken
        },
        body: JSON.stringify({
          resolution: "dismiss"
        })
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(forbiddenResolveResponse.status, 403);

  const resolveResponse = await postWorkshopModerationResolveRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/workshop/moderation/comments/${drop.id}/${createdCommentId}/resolve`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": creatorSession.sessionToken
        },
        body: JSON.stringify({
          resolution: "dismiss"
        })
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(resolveResponse.status, 200);
  const resolvePayload = await parseJson<{
    ok: true;
    queue: Array<{
      commentId: string;
    }>;
  }>(resolveResponse);
  assert.equal(resolvePayload.ok, true);
  assert.ok(
    !resolvePayload.queue.some((entry) => entry.commentId === createdCommentId),
    "expected dismissed moderation case to leave queue"
  );

  const publicAfterHideResponse = await getTownhallSocialRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social?drop_ids=${encodeURIComponent(drop.id)}`)
  );
  assert.equal(publicAfterHideResponse.status, 200);
  const publicAfterHidePayload = await parseJson<{
    social: { byDropId: Record<string, TownhallDropSocialSnapshot> };
  }>(publicAfterHideResponse);
  const publicHiddenDrop = socialForDrop(publicAfterHidePayload.social.byDropId, drop.id);
  assert.ok(
    !publicHiddenDrop.comments.some((entry) => entry.id === createdCommentId),
    "expected hidden comment to stay out of public comment list"
  );
  assert.equal(publicHiddenDrop.commentCount, baseline.commentCount + 1);

  const restoreResponse = await postTownhallCommentRestoreRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/restore`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": creatorSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(restoreResponse.status, 200);
  const restorePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(restoreResponse);
  assert.equal(restorePayload.social.commentCount, baseline.commentCount + 2);
  const restoredComment = restorePayload.social.comments.find((entry) => entry.id === createdCommentId);
  assert.ok(restoredComment, "expected restored comment in social snapshot");
  assert.equal(restoredComment?.visibility, "visible");
  assert.equal(restoredComment?.appealRequested, false);

  const forbiddenRestrictResponse = await postTownhallCommentRestrictRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/restrict`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": reporterSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(forbiddenRestrictResponse.status, 403);

  const restrictResponse = await postTownhallCommentRestrictRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/restrict`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": creatorSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(restrictResponse.status, 200);
  const restrictPayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(restrictResponse);
  assert.equal(restrictPayload.social.commentCount, baseline.commentCount + 1);
  const restrictedComment = restrictPayload.social.comments.find((entry) => entry.id === createdCommentId);
  assert.ok(restrictedComment, "expected creator moderator view of restricted comment");
  assert.equal(restrictedComment?.visibility, "restricted");

  const restrictedAppealResponse = await postTownhallCommentAppealRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/appeal`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": session.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(restrictedAppealResponse.status, 201);
  const restrictedAppealPayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(restrictedAppealResponse);
  assert.equal(
    restrictedAppealPayload.social.comments.find((entry) => entry.id === createdCommentId)?.appealRequested,
    true
  );

  const deleteResponse = await postTownhallCommentDeleteRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/delete`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": creatorSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(deleteResponse.status, 200);
  const deletePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(deleteResponse);
  assert.equal(deletePayload.social.commentCount, baseline.commentCount + 1);
  const deletedComment = deletePayload.social.comments.find((entry) => entry.id === createdCommentId);
  assert.ok(deletedComment, "expected creator moderator view of deleted comment");
  assert.equal(deletedComment?.visibility, "deleted");
  assert.equal(deletedComment?.appealRequested, false);

  const restoreAfterDeleteResponse = await postTownhallCommentRestoreRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdCommentId}/restore`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": creatorSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdCommentId })
  );
  assert.equal(restoreAfterDeleteResponse.status, 200);
  const restoreAfterDeletePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(restoreAfterDeleteResponse);
  assert.equal(restoreAfterDeletePayload.social.commentCount, baseline.commentCount + 2);
  assert.equal(
    restoreAfterDeletePayload.social.comments.find((entry) => entry.id === createdCommentId)?.visibility,
    "visible"
  );

  const saveResponse = await postTownhallSaveRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/saves/${drop.id}`, {
      method: "POST",
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(saveResponse.status, 200);
  const savePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(saveResponse);
  assert.equal(savePayload.social.savedByViewer, true);

  const shareResponse = await postTownhallShareRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/shares/${drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": session.sessionToken
      },
      body: JSON.stringify({
        channel: "telegram"
      })
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(shareResponse.status, 201);
  const sharePayload = await parseJson<{ social: TownhallDropSocialSnapshot }>(shareResponse);
  assert.equal(sharePayload.social.shareCount, baseline.shareCount + 1);

  const socialRefreshResponse = await getTownhallSocialRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social?drop_ids=${encodeURIComponent(drop.id)}`, {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(socialRefreshResponse.status, 200);
  const socialRefreshPayload = await parseJson<{
    social: { byDropId: Record<string, TownhallDropSocialSnapshot> };
  }>(socialRefreshResponse);
  const refreshed = socialForDrop(socialRefreshPayload.social.byDropId, drop.id);
  assert.equal(refreshed.likedByViewer, true);
  assert.equal(refreshed.savedByViewer, true);
  assert.equal(refreshed.likeCount, baseline.likeCount + 1);
  assert.equal(refreshed.commentCount, baseline.commentCount + 2);
  assert.equal(refreshed.shareCount, baseline.shareCount + 1);
  assert.equal(refreshed.comments.find((entry) => entry.id === createdCommentId)?.body, commentBody);

  const libraryResponse = await getLibraryRoute(
    new Request("http://127.0.0.1:3000/api/v1/library", {
      headers: {
        "x-ook-session-token": session.sessionToken
      }
    })
  );
  assert.equal(libraryResponse.status, 200);
  const libraryPayload = await parseJson<{
    library: {
      savedDrops: Array<{
        drop: {
          id: string;
        };
      }>;
    };
  }>(libraryResponse);
  assert.ok(
    libraryPayload.library.savedDrops.some((entry) => entry.drop.id === drop.id),
    "expected saved drop in persisted library snapshot"
  );
});

test("proof: workshop moderation resolve accepts restrict and delete", async (t) => {
  const dbPath = createIsolatedDbPath();
  process.env.OOK_BFF_DB_PATH = dbPath;
  process.env.OOK_BFF_PERSISTENCE_BACKEND = "file";

  t.after(async () => {
    delete process.env.OOK_BFF_DB_PATH;
    delete process.env.OOK_BFF_PERSISTENCE_BACKEND;
    await fs.rm(dbPath, { force: true });
  });

  const creatorSession = await commerceBffService.createSession({
    email: "oneofakinde@oneofakinde.test",
    role: "creator"
  });
  const authorSession = await commerceBffService.createSession({
    email: `townhall-moderation-author-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });
  const reporterSession = await commerceBffService.createSession({
    email: `townhall-moderation-reporter-${randomUUID()}@oneofakinde.test`,
    role: "collector"
  });

  const drop = (await commerceBffService.listDrops())[0];
  assert.ok(drop, "expected at least one drop");

  const commentResponse = await postTownhallCommentRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ook-session-token": authorSession.sessionToken
      },
      body: JSON.stringify({
        body: "moderation resolve action matrix"
      })
    }),
    withRouteParams({ drop_id: drop.id })
  );
  assert.equal(commentResponse.status, 201);
  const createdComment = (await parseJson<{ social: TownhallDropSocialSnapshot }>(commentResponse)).social.comments[0];
  assert.ok(createdComment?.id, "expected created comment id");

  const reportResponse = await postTownhallCommentReportRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/townhall/social/comments/${drop.id}/${createdComment.id}/report`,
      {
        method: "POST",
        headers: {
          "x-ook-session-token": reporterSession.sessionToken
        }
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdComment.id })
  );
  assert.equal(reportResponse.status, 201);

  const restrictResolveResponse = await postWorkshopModerationResolveRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/workshop/moderation/comments/${drop.id}/${createdComment.id}/resolve`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": creatorSession.sessionToken
        },
        body: JSON.stringify({
          resolution: "restrict"
        })
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdComment.id })
  );
  assert.equal(restrictResolveResponse.status, 200);

  const creatorSocialAfterRestrictResponse = await getTownhallSocialRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social?drop_ids=${encodeURIComponent(drop.id)}`, {
      headers: {
        "x-ook-session-token": creatorSession.sessionToken
      }
    })
  );
  assert.equal(creatorSocialAfterRestrictResponse.status, 200);
  const creatorSocialAfterRestrictPayload = await parseJson<{
    social: { byDropId: Record<string, TownhallDropSocialSnapshot> };
  }>(creatorSocialAfterRestrictResponse);
  assert.equal(
    socialForDrop(creatorSocialAfterRestrictPayload.social.byDropId, drop.id).comments.find(
      (entry) => entry.id === createdComment.id
    )?.visibility,
    "restricted"
  );

  const deleteResolveResponse = await postWorkshopModerationResolveRoute(
    new Request(
      `http://127.0.0.1:3000/api/v1/workshop/moderation/comments/${drop.id}/${createdComment.id}/resolve`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-ook-session-token": creatorSession.sessionToken
        },
        body: JSON.stringify({
          resolution: "delete"
        })
      }
    ),
    withRouteParams({ drop_id: drop.id, comment_id: createdComment.id })
  );
  assert.equal(deleteResolveResponse.status, 200);

  const creatorSocialAfterDeleteResponse = await getTownhallSocialRoute(
    new Request(`http://127.0.0.1:3000/api/v1/townhall/social?drop_ids=${encodeURIComponent(drop.id)}`, {
      headers: {
        "x-ook-session-token": creatorSession.sessionToken
      }
    })
  );
  assert.equal(creatorSocialAfterDeleteResponse.status, 200);
  const creatorSocialAfterDeletePayload = await parseJson<{
    social: { byDropId: Record<string, TownhallDropSocialSnapshot> };
  }>(creatorSocialAfterDeleteResponse);
  assert.equal(
    socialForDrop(creatorSocialAfterDeletePayload.social.byDropId, drop.id).comments.find(
      (entry) => entry.id === createdComment.id
    )?.visibility,
    "deleted"
  );
});
