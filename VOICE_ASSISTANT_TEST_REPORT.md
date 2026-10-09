# Voice Assistant Audit and Test Report

**Audit date:** 2026-09-29  
**Repository:** Unnati SHG Management System  
**Result:** The assistant is integrated and verified for navigation, member queries, member add/update/delete, and monthly savings. It is **not** complete CRUD coverage for every module, and Hindi/Marathi speech synthesis could not be verified because this browser has no matching voices.

> Speech-provider update: the Azure-specific findings below describe the earlier implementation. Voice input/output now use the Gemini API through authenticated backend endpoints; configure `GEMINI_API_KEY` in `backend/.env`. Current models are `gemini-3.1-flash-lite` for audio transcription and `gemini-2.5-flash-preview-tts` for speech generation.

## A. Modules and application architecture discovered

The frontend is a single-page React application, not a React Router application. `Shell` selects module keys and `View` maps those keys to components in `frontend/src/App.jsx`. The backend mounts APIs under `/api` in `backend/src/app.js`; resources are Mongoose models in MongoDB.

The 34 registered destinations are:

`dashboard`, `members`, `savings`, `loans`, `ledger`, `reports`, `insights`, `profile`, `settings`, `meetings`, `attendance`, `notifications`, `passbook`, `monthly`, `balance`, `loanDetails`, `loanDemandRisk`, `loanCollection`, `otherExpense`, `otherIncome`, `goals`, `emergency`, `documents`, `schemes`, `editRequests`, `loanApplication`, `loanApplications`, `memberBalanceSheet`, `calculationReport`, `removeMember`, `rulesNotice`, `shareApp`, `penaltySettings`, `interestSettings`.

The app also contains authentication/registration, dashboards, member finance views, reports/analytics, and correction-request flows. There are no separate URL routes for those pages; their route-equivalent is the `active` module key.

### Backend module/API map

| Module / frontend area | API and controller/model path | Existing persistence/action |
|---|---|---|
| Dashboard, SHG profile | `/api/shgs`, `/api/shgs/:id` — `shgController`, `SHG` | Read; admin create/update |
| Members | `/api/members` — `memberController`, `Member` | Read; admin create/update/delete |
| Savings / passbook | `/api/savings` — `savingsController`, `Savings`, `Transaction` | Read; admin create; records a ledger transaction |
| Loans / loan details / risk | `/api/loans` — `loanController`, `Loan`, `Repayment`, `Transaction` | Read; admin apply/approve/reject/disburse/repay |
| Loan applications | `/api/loan-applications` — `loanApplicationController`, `LoanApplication`, `Loan` | Read/create; admin approve/reject |
| Ledger / income / expenses | `/api/transactions` — `transactionController`, `Transaction` | Read; admin create |
| Loan collection | `/api/payment-collections` — `paymentCollectionController`, `PaymentCollection`, `Repayment`, `Loan`, `Transaction` | Read; admin EMI collection |
| Meetings / attendance | `/api/meetings` — `meetingController`, `Meeting`, `Attendance` | Read; admin create/update/mark attendance |
| Notifications | `/api/notifications` — `notificationController`, `Notification` | Read; admin create/send reminders; mark read |
| Reports / analytics | `/api/reports/summary`, `/api/reports/exports` — `reportController` | Authenticated reads |
| Goals | `/api/goals`, `/api/goals/:id/contributions` — `resourceController`, `Goal` | Read; admin create/update/contribute |
| Emergency fund | `/api/emergency-fund`, `/api/emergency-fund/transactions` — `resourceController`, `EmergencyFund`, `Transaction` | Read; admin financial transaction |
| Documents | `/api/documents`, `/api/documents/upload`, `/api/documents/:id` — `resourceController`, `Document` | Read; admin create/upload/update |
| Government schemes | `/api/government-schemes` — `resourceController`, `GovernmentScheme` | Read; admin create/update |
| Rules/notices | `/api/rule-notices` — `resourceController`, `RuleNotice` | Read; admin create/update |
| Correction requests | `/api/edit-requests` — `editRequestController`, `EditRequest` | Member create; admin review/update |
| Authentication | `/api/auth/*` — `authController`, `User`, `SHG`, `Member` | Registration, login, recovery, current user |

Role restrictions are enforced by existing route middleware and SHG scoping in `backend/src/middleware/auth.js`. Frontend screens additionally filter member navigation and guard module rendering.

## B. Registered navigation intent matrix

The automated phrase suite exercised **all 290 registered phrase examples** (113 English, 89 Hindi, 88 Marathi) against their expected intent. This verifies local classification, not 290 separate browser/device speech sessions. Only the browser UI routes named in the last column were directly exercised.

| Module | Intent | Phrase classification | Browser text/UI navigation | Voice / conversation | API/DB |
|---|---|---|---|---|---|
| Dashboard | `OPEN_DASHBOARD` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Members | `OPEN_MEMBERS` | EN/HI/MR PASS | Member denial tested; admin route not individually opened | No module-specific mic test | Read view; no navigation mutation |
| Savings | `OPEN_SAVINGS` | EN/HI/MR PASS; mixed phrase PASS | Hindi UI route PASS | Simulated recognition pipeline; no physical speech | Read view; separate savings write verified |
| Loans | `OPEN_LOANS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Ledger | `OPEN_TRANSACTIONS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Reports | `OPEN_REPORTS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Authenticated read |
| Insights | `OPEN_ANALYTICS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Authenticated read |
| Profile | `OPEN_PROFILE` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Settings | `OPEN_SETTINGS` | EN/HI/MR PASS | Member access denied as intended | No module-specific mic test | Admin-only view |
| Meetings | `OPEN_MEETINGS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Attendance | `OPEN_ATTENDANCE` | EN/HI/MR PASS | Marathi UI route PASS | Simulated recognition pipeline; no physical speech | Read view |
| Notifications | `OPEN_NOTIFICATIONS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Passbook | `OPEN_PASSBOOK` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Monthly accounts | `OPEN_MONTHLY_ACCOUNTS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Report/read view |
| Balance sheet | `OPEN_BALANCE_SHEET` | EN/HI/MR PASS after phrase collision fix | Not separately browser-routed | No module-specific mic test | Report/read view |
| Loan details | `OPEN_LOAN_DETAILS` | EN/HI/MR PASS; mixed phrase PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Loan demand/risk | `OPEN_LOAN_DEMAND_RISK` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Loan collection | `OPEN_LOAN_COLLECTION` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; collection writes unsupported |
| Expenses | `OPEN_EXPENSES` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; writes unsupported |
| Income | `OPEN_INCOME` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; writes unsupported |
| Goals | `OPEN_GOALS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; writes unsupported |
| Emergency fund | `OPEN_EMERGENCY_FUND` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; transactions unsupported |
| Documents | `OPEN_DOCUMENTS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; upload/update unsupported |
| Schemes | `OPEN_SCHEMES` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; writes unsupported |
| Correction requests | `OPEN_CORRECTION_REQUESTS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; assistant submission unsupported |
| Member loan application | `OPEN_MEMBER_LOAN_APPLICATION` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Existing API; assistant submission unsupported |
| Loan application list | `OPEN_MEMBER_LOAN_REQUESTS` | EN/HI/MR PASS after plural collision fix | Not separately browser-routed | No module-specific mic test | Read view; approval unsupported |
| Member balance sheet | `OPEN_MEMBER_BALANCE` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Calculation report | `OPEN_CALCULATION_REPORT` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view |
| Remove-member screen | `OPEN_REMOVE_MEMBER` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Screen navigation; conversational delete is separate |
| Rules/notices | `OPEN_RULES` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Read view; writes unsupported |
| Share app | `OPEN_SHARE` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Existing share UI |
| Penalty settings | `OPEN_PENALTY_SETTINGS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Admin settings UI |
| Interest settings | `OPEN_INTEREST_SETTINGS` | EN/HI/MR PASS | Not separately browser-routed | No module-specific mic test | Admin settings UI |

## C. Conversation, CRUD, and financial verification

| Capability | Test performed | Result |
|---|---|---|
| Text input / chat history | Browser typed commands and multiple assistant turns | PASS; user and assistant text remained visible |
| English two-way conversation | Browser form collection across name, phone, address, and date | PASS |
| Voice-message chat history / state | Browser-injected `SpeechRecognition` test double supplied multiple consecutive results through the actual UI callback | PASS for callback-to-chat and conversation-state wiring; **not** a real microphone utterance |
| Corrections / memory | Browser entered a phone, corrected it mid-flow, continued, and inspected preview | PASS; corrected value replaced the prior value and the current question remained active |
| Cancel | Cancelled pending add/update previews; queried isolated MongoDB afterward | PASS; no pending add was persisted |
| Confirm | Confirmed add/update/delete/savings in assistant UI | PASS for the tested isolated records |
| Member add | Assistant `POST /api/members`, then collection re-read | PASS; name, phone, address and joining date were present in MongoDB |
| Member update | Assistant `PATCH /api/members/:id`, then member re-read | PASS; phone changed from old to new value |
| Member delete | Assistant `DELETE /api/members/:id`, then SHG member-list re-read | PASS; selected member absent. The existing backend delete also removes that member's Savings documents and refuses deletion with an outstanding loan. |
| Monthly savings | Assistant `POST /api/savings`, then savings collection re-read | PASS; amount/month verified and linked transaction existed |
| Loan repayment/disbursement, expense, income, emergency-fund transfer, payment collection | Existing API routes inspected; no assistant action implemented or executed | NOT IMPLEMENTED / NOT TESTED |
| Remaining module CRUD | Existing routes/controllers mapped; assistant actions not registered | NOT IMPLEMENTED / NOT TESTED |
| Member role | Created a member account in isolated DB; assistant denied add/admin navigation and denied another member's savings query; direct `POST /api/members` returned HTTP 403 | PASS for tested checks |
| Ambiguous member | Duplicate first-name fixtures through intent engine | PASS; returned clarification candidates rather than selecting the first match |
| Confirmation false positives | “maybe”, “yesterday”, and “ठीक है शायद” | PASS; not classified as confirmation |
| English TTS | Browser exposed English voices and assistant status reached “Speaking…” then “Ready” | PASS for browser speech-synthesis event path; acoustic output was not independently recorded |
| Hindi/Marathi TTS | Browser voice list had English voices only; UI showed localized text and a localized “could not play speech” error | BLOCKED by missing browser/device voices. No English fallback is spoken. |
| Real STT | Browser API existed; clicking Speak entered “Listening…”, then returned a friendly no-speech error after silence | PARTIAL; permission/start/error path verified, but no real voice transcript was captured |
| Selected language | Switched assistant to Hindi and Marathi and issued navigation commands | PASS for localized response text; TTS unavailable for these locales on this browser |

Database checks used only `unnati_assistant_audit_20260929`, a throwaway local MongoDB database, not the application's default `shgms` database. The test records were verified via the authenticated API and Mongo-backed reads.

## D. Intent/action-to-API coverage

| Assistant intent/action | Expected action | Actual route | Tested? | Result / remaining issue |
|---|---|---|---|---|
| 34 `OPEN_*` navigation intents | Select the mapped `View` key after role check | Existing module components; APIs listed above | All 290 examples unit-tested; selected UI routes manually tested | PASS for classification; only representative UI routes exercised |
| `QUERY_MEMBER_COUNT` | Answer count from loaded SHG data | Existing `/api/members` load | Unit/browser data use | PASS |
| `QUERY_GROUP_BALANCE` | Answer balance from loaded transaction summary | Existing `/api/reports/summary` and transaction-derived summary | Classifier tests | PASS for local summary behavior |
| `QUERY_MEMBER`, `QUERY_MEMBER_SAVINGS`, `QUERY_MEMBER_LOANS` | Return selected member's profile/financial summary | Loaded `/api/members`, `/api/savings`, `/api/loans` | Unit and member/admin browser checks | PASS for tested data; broader natural-language search is limited |
| `CLARIFY_MEMBER`, `ASK_MEMBER` | Ask for unique member name/ID | No mutation endpoint | Intent/browser logic | PASS for ambiguity clarification |
| `ADD_MEMBER` | Collect, validate, preview, confirm, create, re-read | `POST /api/members`; `GET /api/members?shg=...` | Isolated Mongo E2E | PASS |
| `UPDATE_MEMBER` | Resolve member/field, preview old → new, confirm, update, re-read | `PATCH /api/members/:id`; `GET /api/members/:id` | Isolated Mongo E2E and API test | PASS for phone update; only name/phone/address/join date/status are allowlisted |
| `DELETE_MEMBER` | Resolve target, warn, confirm, delete, re-read | `DELETE /api/members/:id`; `GET /api/members?shg=...` | Isolated Mongo E2E and API test | PASS for target removal; backend's cascading Savings deletion is disclosed in preview |
| `RECORD_SAVINGS` | Collect member/amount/month, preview, confirm, create, re-read | `POST /api/savings`; `GET /api/savings?shg=...&member=...&month=...` | Isolated Mongo E2E | PASS; linked ledger transaction also checked |
| `CONFIRM`, `CANCEL`, `RESTART` | Advance only on explicit confirmation; cancel without mutation | Local conversation state | Unit tests and browser cancel/confirm | PASS for tested English/Hindi/Marathi confirmation phrases |
| All other write APIs | Use each existing module workflow | Existing APIs remain available in app | Inspected, not called through assistant | NOT IMPLEMENTED; see remaining blockers |

## E. Bugs found and fixed

1. Spoken responses were unchecked by default. Speech is now enabled by default, queued rather than cancelling previous responses, and status is shown.
2. The browser had only English voices. The assistant now refuses a mismatched-language voice and keeps the visible response with a localized speech-availability error.
3. “Add a member” (with an article) did not match the add flow. Added the natural variation.
4. Intent phrase overlap routed “show/open group balance” and plural “loan applications” to the wrong intent. Added explicit disambiguation and tested all registered examples.
5. Confirmation matching used substring search and could interpret larger phrases as “yes”. Confirmation/cancellation now match whole utterances; “No” and localized cancel phrases cancel.
6. Ambiguous first names could return the first matching member. The engine now clarifies and awaits a unique name or ID.
7. Member savings results had been matched only by display name. The loaded record now retains its member ID and the assistant filters by ID.
8. Member-specific questions are denied unless they target the logged-in member. The UI access policy and backend authorization were both exercised.
9. Add/update/delete/savings previously could have produced success without a post-write read. All four assistant actions now re-read persisted data before success.
10. Assistant update previews displayed `—` for a populated phone because the localized label was used as the member property key. The old/new preview now uses the actual field key.
11. Empty speech recognition results could throw. They now become a friendly no-speech error.
12. The Node test runner could not import the action router because Vite's `import.meta.env` was unguarded and the API import was extensionless. The API base now safely handles the Node test environment.
13. Member-query clarification intercepted the registered “member loan requests” navigation phrase. Registered longer navigation phrases now take priority; the full multilingual phrase suite passes.
14. Browser-only synthesis could not provide Hindi/Marathi voices on the tested device. Voice recognition and female neural synthesis now use Azure Speech with the selected language locale.
15. Some registered Marathi phrases were classified correctly but assigned English response language. Language detection now prioritizes the longest registered localized phrase.

## F. Tests and build run

- `frontend`: `npm test` — **21 tests passed** after Azure Speech integration.
- `frontend`: targeted ESLint over assistant sources/tests and `src/services/api.js` — passed.
- `frontend`: `npm run build` — passed. Vite reports the application bundle exceeds 500 kB after adding the speech SDK.
- `backend`: `npm test` — **3 speech-token tests passed**, plus the server syntax check.
- `backend`: `node --check` over all 63 backend JavaScript files — passed.
- Editor diagnostics on changed assistant/API/app files — no errors.
- Browser: Vite app and backend started against the isolated database; admin/member sessions, assistant flows, response text/status, APIs, and persisted records were exercised.

## G. Environment variables

Gemini is used only for audio transcription and speech synthesis. It does not choose assistant actions or access application data directly.

| Variable | Used by | Required/default |
|---|---|---|
| `VITE_API_BASE_URL` | Frontend API base | Optional; defaults to `http://localhost:5000/api` |
| `PORT` | Backend listener | Optional; defaults to `5000` |
| `MONGODB_URI` | MongoDB connection | Configure for the intended database; code defaults to local `mongodb://127.0.0.1:27017/shgms` |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | MongoDB selection timeout | Optional |
| `JWT_SECRET` | JWT signing/verification | Set a strong value outside local development |
| `JWT_EXPIRES_IN` | JWT lifetime | Optional |
| `CLIENT_ORIGIN` | CORS origin | Optional |
| `NODE_ENV` | Error response behavior | Optional |
| `EMI_REMINDER_INTERVAL_MS` | Reminder schedule | Optional |
| `SMS_PROVIDER`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | Existing SMS integration | Only needed if configuring SMS |
| `GEMINI_API_KEY` | Gemini audio transcription and speech synthesis | Required for voice input/output; keep in backend `.env` only |

## H. Start and test commands

In two terminals from the repository root:

```powershell
Set-Location .\backend
npm install
npm start
```

```powershell
Set-Location .\frontend
npm install
npm run dev
```

Targeted verification:

```powershell
Set-Location .\frontend
npm test
npm run build
npx eslint src/assistant src/services/api.js
```

```powershell
Set-Location .\backend
npm test
```

## I. Remaining blockers and limitations

- This is a deterministic phrase-matching assistant, not an LLM/ChatGPT integration. It does not understand arbitrary phrasing or infer all entities.
- Previous browser-only Hindi/Marathi synthesis was limited by missing system voices. Gemini TTS is not dependent on browser-installed language voices.
- Real Gemini microphone capture and spoken output remain unverified until a valid `GEMINI_API_KEY` is configured.
- Assistant CRUD currently covers member add/update/delete and savings recording only. Loan application, loan approval/disbursement/repayment, payment collection, income/expense, attendance, meetings, notifications, goals, emergency-fund, documents, schemes, rules, and correction-request mutations are **not** integrated into the assistant.
- The full app's visual screen for every module was not individually browser-tested; all registered intent examples were classifier-tested, and backend routes were mapped.
- Full-project ESLint still has unrelated/pre-existing duplicate-key and React hook warnings/errors in `App.jsx`; the targeted assistant lint is clean.
- The isolated audit database `unnati_assistant_audit_20260929` was dropped after verification, and the audit servers on ports 5101, 5173, and 5174 were stopped. The default `shgms` database was not modified.
- Latest multilingual improvements infer Hindi/Marathi from registered phrases and have offline tests. Gemini handles microphone transcription and response speech; it requires a server-side `GEMINI_API_KEY`, so live Gemini audio remains unverified until credentials are configured.

## J. Files changed for assistant integration and this audit

- `AI_ASSISTANT_ARCHITECTURE.md`
- `VOICE_ASSISTANT_TEST_REPORT.md`
- `README.md`
- `frontend/package.json`
- `frontend/src/App.jsx`
- `frontend/src/App.css`
- `frontend/src/services/api.js`
- `frontend/src/assistant/AssistantPanel.jsx`
- `frontend/src/assistant/accessPolicy.js`
- `frontend/src/assistant/accessPolicy.test.js`
- `frontend/src/assistant/actionRouter.js`
- `frontend/src/assistant/actionRouter.test.js`
- `frontend/src/assistant/conversationManager.js`
- `frontend/src/assistant/conversationManager.test.js`
- `frontend/src/assistant/intentEngine.js`
- `frontend/src/assistant/intentEngine.test.js`
- `frontend/src/assistant/intents.json`
- `frontend/src/assistant/speechService.js`
- `frontend/src/assistant/speechService.test.js`
- `frontend/src/assistant/ttsService.js`
- `frontend/src/assistant/ttsService.test.js`
- `frontend/package-lock.json`
- `backend/.env.example`
- `backend/package.json`
- `backend/src/app.js`
- `backend/src/controllers/speechController.js`
- `backend/src/controllers/speechController.test.js`
- `backend/src/routes/speechRoutes.js`
- `backend/src/services/geminiSpeechService.js`
