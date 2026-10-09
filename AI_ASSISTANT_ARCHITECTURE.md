# Conversational Assistant Architecture

## Integration

The assistant is a modal opened from the existing application shell in `frontend/src/App.jsx`. It receives the authenticated user's role and the same loaded SHG data used by the app. The module registry in `frontend/src/assistant/intents.json` connects multilingual phrases to existing module keys; navigation remains in the existing shell rather than creating a second router.

The assistant is split into:

- `intentEngine.js`: local phrase matching, language detection, and supported query/action classification.
- `conversationManager.js`: collecting-data and awaiting-confirmation stages for guided flows.
- `AssistantPanel.jsx`: typed/voice input, multilingual prompts, response history, module navigation, queries, previews, and confirmation.
- `accessPolicy.js`: the assistant's member-readable module allowlist.
- `speechService.js` and `ttsService.js`: microphone capture and Gemini audio transcription and speech synthesis.
- `actionRouter.js`: a fixed allowlist of writable action IDs, endpoints, and roles.

Gemini transcribes microphone audio, synthesizes response audio, and handles typed or transcribed messages that the local intent engine cannot resolve. Its response is constrained to an answer, a registered module destination, or an allowlisted action. The frontend rechecks navigation and action permissions; the model never executes actions or calls application APIs.

## Supported behavior

### Navigation

The intent dataset declares 34 module-navigation intents covering the dashboard, members, savings, loans, ledger, reports, insights, profile, settings, meetings, attendance, notifications, passbook, monthly accounts, balance sheets, loan collection/details/risk, expenses, income, goals, emergency fund, documents, schemes, correction requests, loan applications, calculation report, rules/notices, removal, sharing, and penalty/interest settings. Registered English, Hindi, and Marathi examples are tested against their expected intent. Members may only navigate to modules exposed by the member navigation; the view layer retains its role guard.

### Read-only questions

- Member count, admin member list, group balance/health/savings, goal-based savings progress, outstanding loans, pending applications, and today's transaction summaries use records loaded through the existing authenticated APIs. Goal progress is admin-only, matching the current Goals module visibility.
- Admins can ask for savings and/or loan EMI payment status by month or year. Monthly results include the payment date for paid members and due date plus overdue/not-yet-due status for unpaid members. For EMI, the report uses each active loan's next due date and repayment/collection records in the selected month; savings due dates use the SHG's configured due day. The authenticated, admin-only API scopes members to the current SHG.
- After a payment status answer, or in a direct request, admins can create in-app notifications for every unpaid member or explicitly named unpaid recipients. Notifications are saved per member and shown in that member's existing notification center. This action is in-app only and does not attempt SMS/Twilio delivery.
- Named-member profile, savings, and loan questions are answered from the loaded member/financial records.
- Gemini receives up to the ten most recent user text turns (maximum 500 characters each) to resolve pronouns and follow-ups. Assistant replies containing private record values are not sent back to Gemini; structured data queries are resolved locally from the authenticated data already loaded by the application.
- A member account may only ask named-member detail/savings/loan questions about its own linked member record. The assistant fails closed if it cannot identify that record.
- Other broad searches return a clarification rather than claiming a result.
- Member-specific questions without a target ask for a member; ambiguous matches ask the user to choose a unique name or ID.
- General SHG, app-use, and financial-health questions are answered conversationally by Gemini in English, Hindi, and Marathi. If Gemini is unavailable, the assistant reports the service issue instead of presenting a fixed or potentially misleading answer.
- The assistant sends Gemini only the current request, selected language, role-authorized module keys, and role-allowed action IDs. It does not send loaded member records or SHG database data for general conversation.
- Recent user text is sent only as bounded conversation context to support follow-up questions. Assistant responses with personal records, loaded records, and credentials are not added to Gemini context.

### Confirmed writes

Only admins can start these guided flows:

1. **Add member** — collects name, optional phone/address, and optional joining date.
2. **Add goal** — collects a title, positive target amount, and optional due date.
3. **Contribute to an active goal** — resolves a goal from the authenticated SHG's loaded goal records, collects a positive amount and optional note, previews the updated saved/remaining amounts, and requires confirmation.
4. **Record monthly savings** — collects a member, positive amount, and `YYYY-MM` month, then previews the received date. The user can correct the received date before confirmation. Existing backend logic derives the due date and late penalty; the assistant does not create a separate fine record.
5. **Update member** — selects one member and one allowlisted profile field, shows old/new values, and requires confirmation.
6. **Delete member** — selects one member and warns that the existing delete endpoint also removes the member's savings; outstanding loans block deletion.
7. **Update SHG settings** — allows only the existing financial setting fields (late penalty, interest rates, monthly savings amount, and due day) and requires explicit confirmation.

Each flow previews its payload and waits for explicit confirmation. Cancellation makes no request. The fixed action router calls the existing authenticated APIs, then re-reads the collection or record to verify the persisted result before reporting success. Goal contributions use the existing `POST /goals/:id/contributions` endpoint; the assistant does not invent goal-fine, monthly-contribution, or other unsupported endpoints. Existing backend validation and authorization remain authoritative. API failures and failed verification do not produce success messages.

These registered mutations are a limited vertical slice, not complete CRUD coverage for every module. Loan applications/approvals/repayments, expense/income transactions, meeting and attendance writes, general notifications, emergency-fund transactions, documents, schemes, and rule maintenance remain in their existing screens/workflows. Payment reminders are the exception described above. The assistant does not synthesize arbitrary endpoints or bypass API authorization. For unsupported writes it explains that no change was made.

## Language and speech

The UI prompts and registered phrase examples support English, Hindi, and Marathi. Microphone audio is sent to the authenticated backend speech endpoints and transcribed by `gemini-3.1-flash-lite`; conversational requests use the same model and response audio is generated by `gemini-2.5-flash-preview-tts` using the `Kore` voice. Typed input remains available. The backend keeps `GEMINI_API_KEY` server-side. Configure it in `backend/.env`; without it, deterministic registered local commands continue to work, while Gemini-dependent chat requests report service unavailability.

Registered phrase matching remains deterministic for commands it already recognizes. Gemini adds conversational answers, bounded follow-up context, structured current-data query classification, and constrained command interpretation for otherwise-unmatched requests; unsupported or ambiguous writes still require the existing guided collection and explicit confirmation.

## Data and security boundaries

- Gemini receives microphone audio for transcription and assistant request text for interpretation/answers, plus response text for speech synthesis. It does not receive database credentials or call application APIs.
- Reads use data already loaded for the authenticated SHG by the application.
- Writes use the existing authenticated API wrapper and a fixed action allowlist.
- Role checks in the UI/action router are a usability boundary, not a replacement for backend authorization.
- Do not add sensitive member information to speech output on shared devices without reviewing the product's privacy requirements.

## Tests

From `frontend/`, run `npm test` for phrase classification, state, role, API routing, structured assistant queries, and speech service tests; run `npm run build` for the production bundle. From `backend/`, run `npm test` for speech and constrained assistant service tests plus the server syntax check. Live Gemini conversation and audio require a valid `GEMINI_API_KEY`.
