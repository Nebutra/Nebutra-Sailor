/**
 * Product Hunt Launch Configuration
 *
 * This file contains all configuration for the Nebutra Sailor PH launch.
 * Update these values as you progress through the launch preparation.
 */

export const PHConfig = {
  // ===================
  // Product Information
  // ===================
  product: {
    name: "Nebutra Sailor",
    slug: "nebutra-sailor", // URL slug on PH (TBD until launch)
    tagline: "Open-source SaaS platform for the Vibe Business era",
    website: "https://nebutra.com",
    github: "https://github.com/Nebutra/Nebutra-Sailor",
  },

  // ===================
  // Launch Details
  // ===================
  launch: {
    targetDate: null as Date | null, // Set when confirmed
    timezone: "America/Los_Angeles", // PT
    launchTime: "00:01", // 12:01 AM PT
    category: "Developer Tools",
    topics: ["Open Source", "SaaS", "Artificial Intelligence", "Developer Tools"],
  },

  // ===================
  // Team
  // ===================
  team: {
    maker: {
      name: "Tseka Luk",
      username: "TsekaLuk",
      twitter: "@nebutra",
    },
    hunter: null as { name: string; username: string } | null, // Set if using external hunter
  },

  // ===================
  // API Configuration
  // ===================
  api: {
    // OAuth Application
    clientId: process.env.PRODUCT_HUNT_API_KEY || "",
    clientSecret: process.env.PRODUCT_HUNT_API_SECRET || "",
    redirectUri: "https://nebutra.com",

    // Developer Token (for automated scripts)
    devToken: process.env.PRODUCT_HUNT_DEV_TOKEN || "",

    // API Endpoints
    graphqlEndpoint: "https://api.producthunt.com/v2/api/graphql",
    oauthEndpoint: "https://api.producthunt.com/v2/oauth",
  },

  // ===================
  // Links
  // ===================
  links: {
    // Fill these in as they become available
    productPage: "", // https://www.producthunt.com/posts/nebutra-sailor
    shipPage: "", // https://www.producthunt.com/upcoming/nebutra-sailor
    launchThread: "", // Twitter thread URL
    linkedinPost: "", // LinkedIn post URL
    hnPost: "", // Hacker News post URL
  },

  // ===================
  // UTM Tracking
  // ===================
  tracking: {
    campaign: "ph_launch",
    utmParams: {
      producthunt: "utm_source=producthunt&utm_medium=referral&utm_campaign=ph_launch",
      twitter: "utm_source=twitter&utm_medium=social&utm_campaign=ph_launch",
      linkedin: "utm_source=linkedin&utm_medium=social&utm_campaign=ph_launch",
      email: "utm_source=email&utm_medium=newsletter&utm_campaign=ph_launch",
      hackernews: "utm_source=hackernews&utm_medium=referral&utm_campaign=ph_launch",
    },
  },

  // ===================
  // Goals
  // ===================
  goals: {
    mustHave: {
      upvotes: 300,
      comments: 30,
      ranking: 10, // Top 10
      githubStars: 50,
      signups: 50,
    },
    stretch: {
      upvotes: 500,
      comments: 100,
      ranking: 5, // Top 5
      githubStars: 200,
      signups: 200,
    },
  },

  // ===================
  // Copy (from PRODUCT_COPY.md)
  // ===================
  copy: {
    taglineOptions: [
      "Open-source SaaS platform for the Vibe Business era",
      "From AI demo to profitable SaaS in weeks, not months",
      "Enterprise SaaS architecture for one-person companies",
      "The AI-native foundation for your next SaaS unicorn",
      "Ship production-ready SaaS with AI superpowers built-in",
    ],
    selectedTagline: 0, // Index of selected tagline

    description: `Stop rebuilding the same SaaS infrastructure. Nebutra Sailor is an open-source, enterprise-grade monorepo with multi-tenant auth, AI/LLM integration, billing, and compliance built-in. Go from Vibe Coding to Vibe Business.`,
  },
} as const;

// ===================
// Helper Functions
// ===================

/**
 * Generate a tracked URL for a specific source
 */
export function getTrackedUrl(
  baseUrl: string,
  source: keyof typeof PHConfig.tracking.utmParams,
): string {
  const params = PHConfig.tracking.utmParams[source];
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${params}`;
}

/**
 * Get the Product Hunt product URL
 */
export function getPHProductUrl(): string {
  if (PHConfig.links.productPage) {
    return PHConfig.links.productPage;
  }
  return `https://www.producthunt.com/posts/${PHConfig.product.slug}`;
}

/**
 * Get the Product Hunt Ship page URL
 */
export function getPHShipUrl(): string {
  if (PHConfig.links.shipPage) {
    return PHConfig.links.shipPage;
  }
  return `https://www.producthunt.com/upcoming/${PHConfig.product.slug}`;
}

/**
 * Calculate days until launch
 */
export function getDaysUntilLaunch(): number | null {
  if (!PHConfig.launch.targetDate) {
    return null;
  }
  const now = new Date();
  const launch = new Date(PHConfig.launch.targetDate);
  const diffTime = launch.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if we're in launch day
 */
export function isLaunchDay(): boolean {
  if (!PHConfig.launch.targetDate) {
    return false;
  }
  const now = new Date();
  const launch = new Date(PHConfig.launch.targetDate);
  return (
    now.getFullYear() === launch.getFullYear() &&
    now.getMonth() === launch.getMonth() &&
    now.getDate() === launch.getDate()
  );
}

// ===================
// GraphQL Queries
// ===================

export const PHQueries = {
  // Get current user info
  ME: `
    query {
      viewer {
        user {
          id
          name
          username
          profileImage
        }
      }
    }
  `,

  // Get post by slug
  POST: `
    query GetPost($slug: String!) {
      post(slug: $slug) {
        id
        name
        tagline
        description
        votesCount
        commentsCount
        createdAt
        makers {
          id
          name
          username
        }
      }
    }
  `,

  // Get today's posts
  POSTS_TODAY: `
    query {
      posts(order: VOTES, postedAfter: "today") {
        edges {
          node {
            id
            name
            tagline
            votesCount
          }
        }
      }
    }
  `,
};

export default PHConfig;
