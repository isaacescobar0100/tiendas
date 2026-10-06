import { afterEach, describe, expect, it, vi } from "vitest";
import { isReservedProductSlug, isReservedSlug, mailboxKey, slugify } from "@/lib/utils";
import { isHostname, isMainHost, storeSubdomain, subdomainSlug } from "@/lib/store-host";

describe("slugs", () => {
  it("convierte nombres a URL", () => {
    expect(slugify("Sureños Club")).toBe("surenos-club");
    expect(slugify("  Piña  Colada! ")).toBe("pina-colada");
  });

  it("solo los nombres reservados exactos", () => {
    expect(isReservedSlug("admin")).toBe(true);
    expect(isReservedSlug("sede")).toBe(true);
    expect(isReservedSlug("apicultura")).toBe(false);
    expect(isReservedSlug("sedeno")).toBe(false);
  });

  it("un producto no puede usar el slug de una página de la tienda", () => {
    expect(isReservedProductSlug("menu")).toBe(true);
    expect(isReservedProductSlug("sedes")).toBe(true);
    expect(isReservedProductSlug("login")).toBe(true);
    expect(isReservedProductSlug("menu-1")).toBe(false);
    expect(isReservedProductSlug("cartera-de-cuero")).toBe(false);
  });
});

describe("buzón de correo (límite por destinatario)", () => {
  it("variantes del mismo buzón cuentan igual", () => {
    expect(mailboxKey("Ana.Perez+1@Gmail.com")).toBe("anaperez@gmail.com");
    expect(mailboxKey("anaperez@googlemail.com")).toBe("anaperez@gmail.com");
    expect(mailboxKey("ana+promo@hotmail.com")).toBe("ana@hotmail.com");
    expect(mailboxKey("ana.perez@hotmail.com")).toBe("ana.perez@hotmail.com");
  });
});

describe("dominios", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("solo nombres de dominio reales", () => {
    for (const ok of ["surenosclub.com", "pedidos.mi-tienda.co"]) expect(isHostname(ok)).toBe(true);
    for (const bad of ["..", ".", "a@b.com", "-a.com", "a-.com", "localhost", "x..com", "a.com/x", "a.com?x"]) {
      expect(isHostname(bad)).toBe(false);
    }
  });

  it("subdominio de la tienda en el dominio puente", () => {
    vi.stubEnv("STORE_ROOT_DOMAIN", "acordemusic.com");
    expect(storeSubdomain("surenos")).toBe("surenos.acordemusic.com");
    expect(subdomainSlug("surenos.acordemusic.com")).toBe("surenos");
    expect(subdomainSlug("admin.acordemusic.com")).toBeNull();
    expect(subdomainSlug("a.b.acordemusic.com")).toBeNull();
    expect(subdomainSlug("acordemusic.com")).toBeNull();
  });

  it("los dominios técnicos nunca son una tienda", () => {
    expect(isMainHost("tiendas.vercel.app")).toBe(true);
    expect(isMainHost("localhost:3000")).toBe(true);
    expect(isMainHost("surenosclub.com")).toBe(false);
  });
});
