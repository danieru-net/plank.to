# Feedback triage

How we sort and review the emails that arrive at `danielsilvajobs@gmail.com` (see [shared/support.json](../shared/support.json)). What the emails contain, and what the privacy policy promises about them, is in [location-privacy.md](location-privacy.md#feedback-emails).

Keep it light: one person can run this in a few minutes a week, with nothing but the mailbox.

## Labels

Every feedback email gets exactly one type label. The app already puts the type at the start of the subject, so most emails sort themselves:

| Subject starts with | Label |
| --- | --- |
| `Plank idea` | `idea`: something new the app doesn't do. |
| `Plank improvement` | `improvement`: something the app does that could work better. |
| `Plank problem` | `problem`: something broken, confusing, or not working as described. |

Emails written by hand (from the website contact page, or edited subjects) are labelled by reading them. If the sender picked a type that doesn't fit, relabel it; the label is for us, not a judgement of the message.

Add these extra labels when they apply:

- `blocker`: a privacy, safety, accessibility, or data-loss problem. These are looked at the same week, not saved for a session, and must be closed before a release (see [release-checklist.md](release/release-checklist.md), section E).
- `session`: picked to discuss at the next co-design or usability session.
- `replied`: we have answered the sender.
- `done`: shipped, fixed, or decided against (with the reason in the reply or in `docs/`).

### Mailbox setup

When the mailbox is live, create the labels above and add three filters on the subject prefix (`Plank idea`, `Plank improvement`, `Plank problem`) that apply the matching type label. Don't auto-reply: the app already shows "Thanks — we read every message" after sending.

## Weekly pass

1. Label anything the filters missed.
2. Read each new `problem`. Add `blocker` where it applies and act on it now. If device details are missing and needed, ask for them in the reply rather than guessing.
3. Reply where a reply helps (a question, a workaround, or "we've noted this"). Keep the tone calm and thankful; never promise a date.
4. Mark emails worth discussing with `session`. Several emails about the same thing count as one topic.

## In co-design and usability sessions

Bring the `session` emails as short, anonymous summaries: no names, addresses, or quotes that could identify the sender, as the privacy policy says. Use them as prompts ("Some people asked for…; would that help you?"), not as decisions already made. Record what participants said with the other session findings in `docs/`, then move each topic into [plan.md](../plan.md) as a task, or mark it `done` with the reason.

## Deleting

If someone asks us to delete their emails, delete every email from that address (including replies in the thread) and confirm by reply. Anything already summarized for a session stays, because it holds no name or address.
