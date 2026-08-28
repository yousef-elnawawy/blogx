import { algoliasearch } from "algoliasearch";

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID || "SHOF2IL379";
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY || "e4ff94389c74ed75f93e37f7bc736406";

export const searchClient = algoliasearch(APP_ID, SEARCH_KEY);

export interface AlgoliaPostHit {
  objectID: string;
  id: number;
  content: string;
  author_name: string;
  author_username: string;
  author_avatar?: string;
  author_verified?: boolean;
  video_url?: string;
  video_thumbnail?: string;
  hashtags?: string[];
  likes_count?: number;
  comments_count?: number;
  views_count?: number;
  created_at?: number;
  _highlightResult?: any;
}

export interface AlgoliaBlogHit {
  objectID: string;
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  cover_image?: string;
  read_time?: number;
  tags?: string[];
  author_name?: string;
  author_username?: string;
  author_avatar?: string;
  author_verified?: boolean;
  views_count?: number;
  published_at?: number;
  _highlightResult?: any;
}

export interface AlgoliaUserHit {
  objectID: string;
  id: number;
  name: string;
  username: string;
  avatar?: string;
  cover?: string;
  bio?: string;
  location?: string;
  website?: string;
  verified?: boolean;
  followers_count?: number;
  posts_count?: number;
  _highlightResult?: any;
}

export interface AlgoliaCommunityHit {
  objectID: string;
  id: number;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  cover?: string;
  type?: string;
  members_count?: number;
  posts_count?: number;
  _highlightResult?: any;
}

export interface AlgoliaSearchResults {
  posts: AlgoliaPostHit[];
  blogs: AlgoliaBlogHit[];
  users: AlgoliaUserHit[];
  communities: AlgoliaCommunityHit[];
  processingTimeMS: number;
  totalHits: number;
}

/**
 * Execute multi-index search query directly via Algolia global CDN
 */
export async function directAlgoliaSearch(query: string, limit = 12): Promise<AlgoliaSearchResults> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      posts: [],
      blogs: [],
      users: [],
      communities: [],
      processingTimeMS: 0,
      totalHits: 0,
    };
  }

  try {
    const response = await searchClient.search({
      requests: [
        { indexName: "blogs", query: trimmed, hitsPerPage: limit },
        { indexName: "posts", query: trimmed, hitsPerPage: limit },
        { indexName: "users", query: trimmed, hitsPerPage: limit },
        { indexName: "communities", query: trimmed, hitsPerPage: limit },
      ],
    });

    const results = response.results as any[];
    const blogs = (results[0]?.hits || []) as AlgoliaBlogHit[];
    const posts = (results[1]?.hits || []) as AlgoliaPostHit[];
    const users = (results[2]?.hits || []) as AlgoliaUserHit[];
    const communities = (results[3]?.hits || []) as AlgoliaCommunityHit[];

    const processingTimeMS = Math.max(
      results[0]?.processingTimeMS || 0,
      results[1]?.processingTimeMS || 0,
      results[2]?.processingTimeMS || 0,
      results[3]?.processingTimeMS || 0
    );

    const totalHits =
      (results[0]?.nbHits || 0) +
      (results[1]?.nbHits || 0) +
      (results[2]?.nbHits || 0) +
      (results[3]?.nbHits || 0);

    return {
      blogs,
      posts,
      users,
      communities,
      processingTimeMS,
      totalHits,
    };
  } catch (err) {
    console.error("Direct Algolia search failed:", err);
    return {
      posts: [],
      blogs: [],
      users: [],
      communities: [],
      processingTimeMS: 0,
      totalHits: 0,
    };
  }
}
