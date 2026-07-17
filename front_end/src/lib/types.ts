export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // markdown
  coverImage: string | null;
  category: Category | null;
  tags: Tag[];
  status: "draft" | "published";
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface Comment {
  id: number;
  postId: number;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PostQuery {
  page?: number;
  pageSize?: number;
  category?: string; // slug
  tag?: string; // slug
  q?: string; // search
}
