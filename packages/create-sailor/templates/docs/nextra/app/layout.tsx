import { Banner, Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import { Footer, Layout, Navbar } from "nextra-theme-docs";
import "nextra-theme-docs/style.css";

export const metadata = {
  title: { default: "{PRODUCT_NAME} Docs", template: "%s — {PRODUCT_NAME}" },
  description: "Documentation for {PRODUCT_NAME}.",
};

const banner = <Banner storageKey="docs-launch">{"{PRODUCT_NAME}"} docs are live</Banner>;
const navbar = <Navbar logo={<b>{"{PRODUCT_NAME}"}</b>} />;
const footer = (
  <Footer>
    © {new Date().getFullYear()} {"{PRODUCT_NAME}"}
  </Footer>
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head />
      <body>
        <Layout
          banner={banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/your-org/your-repo/tree/main"
          footer={footer}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
