import { describe, expect, test } from "bun:test";
import {
  dedupeOrigins,
  isAllowedWebOrigin,
  isPrivateNetworkHostname,
  parseTrustedOriginsCsv,
} from "../src/lib/web-origin";

const base = {
  trustedOrigins: ["http://localhost:4321"],
  webUrl: "http://localhost:4321",
  allowPrivateNetworkOrigins: true,
};

describe("isPrivateNetworkHostname", () => {
  test("accepts loopback and RFC1918", () => {
    expect(isPrivateNetworkHostname("localhost")).toBe(true);
    expect(isPrivateNetworkHostname("127.0.0.1")).toBe(true);
    expect(isPrivateNetworkHostname("192.168.18.32")).toBe(true);
    expect(isPrivateNetworkHostname("10.0.0.5")).toBe(true);
    expect(isPrivateNetworkHostname("172.16.1.1")).toBe(true);
    expect(isPrivateNetworkHostname("172.31.255.255")).toBe(true);
    expect(isPrivateNetworkHostname("169.254.1.1")).toBe(true);
  });

  test("rejects public and non-private 172", () => {
    expect(isPrivateNetworkHostname("8.8.8.8")).toBe(false);
    expect(isPrivateNetworkHostname("172.15.0.1")).toBe(false);
    expect(isPrivateNetworkHostname("172.32.0.1")).toBe(false);
    expect(isPrivateNetworkHostname("example.com")).toBe(false);
  });
});

describe("parseTrustedOriginsCsv", () => {
  test("parses and normalizes origins", () => {
    expect(
      parseTrustedOriginsCsv(
        " http://192.168.18.32:4321/path ,http://localhost:4321 ",
      ),
    ).toEqual(["http://192.168.18.32:4321", "http://localhost:4321"]);
  });

  test("skips invalid entries", () => {
    expect(parseTrustedOriginsCsv("not-a-url,http://ok.example:1")).toEqual([
      "http://ok.example:1",
    ]);
  });
});

describe("dedupeOrigins", () => {
  test("keeps first occurrence order", () => {
    expect(
      dedupeOrigins([
        "http://localhost:4321",
        "http://192.168.1.1:4321",
        "http://localhost:4321",
      ]),
    ).toEqual(["http://localhost:4321", "http://192.168.1.1:4321"]);
  });
});

describe("isAllowedWebOrigin", () => {
  test("allows empty origin (CLI / no Origin header)", () => {
    expect(isAllowedWebOrigin(undefined, base)).toBe(true);
    expect(isAllowedWebOrigin("", base)).toBe(true);
  });

  test("allows static trusted origins", () => {
    expect(isAllowedWebOrigin("http://localhost:4321", base)).toBe(true);
    expect(
      isAllowedWebOrigin("http://192.168.1.1:4321", {
        ...base,
        trustedOrigins: [
          "http://localhost:4321",
          "http://192.168.1.1:4321",
        ],
      }),
    ).toBe(true);
  });

  test("allows private HTTP LAN when enabled and port matches", () => {
    expect(isAllowedWebOrigin("http://192.168.18.32:4321", base)).toBe(true);
    expect(isAllowedWebOrigin("http://10.1.2.3:4321", base)).toBe(true);
    expect(isAllowedWebOrigin("http://172.20.0.9:4321", base)).toBe(true);
  });

  test("rejects private HTTP with different port", () => {
    expect(isAllowedWebOrigin("http://192.168.18.32:9999", base)).toBe(false);
  });

  test("rejects public origins not on the list", () => {
    expect(isAllowedWebOrigin("http://8.8.8.8:4321", base)).toBe(false);
    expect(isAllowedWebOrigin("https://evil.example", base)).toBe(false);
  });

  test("rejects https LAN even when private allow is on", () => {
    expect(isAllowedWebOrigin("https://192.168.18.32:4321", base)).toBe(false);
  });

  test("rejects private LAN when allow flag is false", () => {
    expect(
      isAllowedWebOrigin("http://192.168.18.32:4321", {
        ...base,
        allowPrivateNetworkOrigins: false,
      }),
    ).toBe(false);
  });

  test("rejects invalid origin strings", () => {
    expect(isAllowedWebOrigin("not a url", base)).toBe(false);
  });
});
