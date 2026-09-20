import type { ConnectableProvider, ProviderCredentialStatus } from "@chavez-harness/shared";
import { testRender } from "@opentui/react/test-utils";
import { describe, expect, test } from "bun:test";
import { act } from "react";
import { ConnectDialog, sanitizeApiKeyPaste } from "../ui/ConnectDialog";

const API_KEY = "sk-test-key-1234";
const MASK_TAIL = "1234";

const PROVIDERS: ProviderCredentialStatus[] = [
  {
    provider: "cursor",
    supported: true,
    configured: false,
    hint: null,
  },
];

describe("sanitizeApiKeyPaste", () => {
  test("quita espacios y saltos de línea", () => {
    expect(sanitizeApiKeyPaste(`  ${API_KEY}\n`)).toBe(API_KEY);
    expect(sanitizeApiKeyPaste("sk- test\n-key")).toBe("sk-test-key");
  });
});

describe("ConnectDialog paste", () => {
  test("pasteBracketedText + Enter guarda la key real", async () => {
    const bag = {
      provider: null as ConnectableProvider | null,
      key: "",
      successMessage: "",
      closed: false,
    };

    const setup = await testRender(
      <box flexDirection="column" width="100%" height="100%">
        <ConnectDialog
          initialProviders={PROVIDERS}
          onClose={() => {
            bag.closed = true;
          }}
          onSuccess={(message) => {
            bag.successMessage = message;
          }}
          onError={() => {}}
          providersApi={{
            listProviders: async () => PROVIDERS,
            upsertProviderCredential: async (provider, apiKey) => {
              bag.provider = provider;
              bag.key = apiKey;
              return {
                provider,
                supported: true,
                configured: true,
                hint: apiKey.slice(-4),
              };
            },
          }}
        />
      </box>,
      { width: 80, height: 16, exitOnCtrlC: false },
    );

    try {
      await act(async () => {
        await setup.renderOnce();
      });

      expect(setup.captureCharFrame()).toContain("cursor");

      await act(async () => {
        setup.mockInput.pressEnter();
      });
      await act(async () => {
        await setup.flush();
        await setup.renderOnce();
      });

      expect(setup.captureCharFrame()).toContain("API key de cursor");

      await act(async () => {
        await setup.mockInput.pasteBracketedText(API_KEY);
      });
      await act(async () => {
        await setup.flush();
        await setup.renderOnce();
      });

      const frameAfterPaste = setup.captureCharFrame();
      expect(frameAfterPaste).toContain(MASK_TAIL);
      expect(frameAfterPaste).not.toContain(API_KEY);
      expect(frameAfterPaste).toContain("••••");

      await act(async () => {
        setup.mockInput.pressEnter();
      });
      await act(async () => {
        await setup.flush();
        await Promise.resolve();
        await setup.renderOnce();
      });

      expect(bag.provider).toBe("cursor");
      expect(bag.key).toBe(API_KEY);
      expect(bag.successMessage).toContain("1234");
      expect(bag.closed).toBe(true);
    } finally {
      setup.renderer.destroy();
    }
  });
});
