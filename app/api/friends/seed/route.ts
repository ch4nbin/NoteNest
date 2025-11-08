import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

// Placeholder friend data
const placeholderFriends = [
  {
    email: `friend1-${Date.now()}@notenest.test`,
    password: "TestFriend123!",
    username: "Alex Chen",
    notes: [
      {
        title: "Introduction to React Hooks",
        content: {
          sections: [
            {
              title: "What are React Hooks?",
              content:
                "React Hooks are functions that let you use state and other React features in functional components. They were introduced in React 16.8 to allow developers to write cleaner, more reusable code without using class components. Hooks follow a simple naming convention - they all start with 'use', like useState, useEffect, and useContext.",
            },
            {
              title: "Common Hooks",
              content:
                "The most commonly used hooks include useState for managing component state, useEffect for handling side effects like API calls and subscriptions, useContext for accessing context values, and useReducer for managing complex state logic. Each hook serves a specific purpose and can be combined to build powerful, interactive user interfaces.",
            },
            {
              title: "Best Practices",
              content:
                "When using hooks, it's important to follow the Rules of Hooks: only call hooks at the top level of your component, never inside loops or conditions, and only call them from React function components or custom hooks. This ensures that hooks are called in the same order every render, which is crucial for React's internal state management.",
            },
          ],
        },
        tags: ["React", "JavaScript", "Web Development", "Frontend"],
        source_url: "https://example.com/react-hooks",
        source_type: "url",
        is_public: true,
      },
      {
        title: "Understanding Async/Await in JavaScript",
        content: {
          sections: [
            {
              title: "The Problem with Promises",
              content:
                "Before async/await, JavaScript developers used promises and .then() chains to handle asynchronous operations. While promises solved the callback hell problem, they could still lead to deeply nested code that was difficult to read and maintain. Async/await provides a more synchronous-looking syntax that makes asynchronous code easier to understand.",
            },
            {
              title: "How Async/Await Works",
              content:
                "The async keyword is used to declare an asynchronous function, which automatically returns a promise. Inside an async function, you can use the await keyword to pause execution until a promise resolves. This makes asynchronous code look and behave more like synchronous code, improving readability and error handling.",
            },
            {
              title: "Error Handling",
              content:
                "Error handling with async/await is straightforward - you can use traditional try/catch blocks instead of .catch() methods. This makes error handling more intuitive and allows for better control flow. However, it's important to remember that unhandled promise rejections in async functions will still need to be caught.",
            },
          ],
        },
        tags: ["JavaScript", "Async Programming", "Web Development"],
        source_url: "https://example.com/async-await",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    email: `friend2-${Date.now()}@notenest.test`,
    password: "TestFriend123!",
    username: "Samira Patel",
    notes: [
      {
        title: "Database Design Principles",
        content: {
          sections: [
            {
              title: "Normalization",
              content:
                "Database normalization is the process of organizing data to minimize redundancy and dependency. The main goal is to divide large tables into smaller, related tables and define relationships between them. Normalization helps maintain data integrity, reduces storage space, and makes databases easier to maintain and update.",
            },
            {
              title: "Primary and Foreign Keys",
              content:
                "Primary keys uniquely identify each record in a table, while foreign keys create relationships between tables by referencing the primary key of another table. These keys are essential for maintaining referential integrity and enabling efficient data retrieval through joins. Proper key design is crucial for database performance and data consistency.",
            },
            {
              title: "Indexing Strategies",
              content:
                "Indexes are data structures that improve the speed of data retrieval operations. They work like an index in a book, allowing the database to quickly locate data without scanning every row. However, indexes also require additional storage space and can slow down write operations, so they must be used strategically based on query patterns.",
            },
          ],
        },
        tags: ["Database", "SQL", "Data Science", "Backend"],
        source_url: "https://example.com/database-design",
        source_type: "url",
        is_public: true,
      },
      {
        title: "Machine Learning Fundamentals",
        content: {
          sections: [
            {
              title: "Types of Learning",
              content:
                "Machine learning can be broadly categorized into three types: supervised learning, where models learn from labeled data; unsupervised learning, where patterns are discovered in unlabeled data; and reinforcement learning, where agents learn through trial and error with rewards and penalties. Each type has different applications and use cases.",
            },
            {
              title: "Common Algorithms",
              content:
                "Popular machine learning algorithms include linear regression for predicting continuous values, decision trees for classification tasks, k-means clustering for grouping similar data points, and neural networks for complex pattern recognition. The choice of algorithm depends on the problem type, data characteristics, and desired outcomes.",
            },
            {
              title: "Model Evaluation",
              content:
                "Evaluating machine learning models is crucial to ensure they perform well on new, unseen data. Common evaluation metrics include accuracy, precision, recall, and F1-score for classification problems, and mean squared error or R-squared for regression problems. Cross-validation techniques help assess model performance more reliably.",
            },
          ],
        },
        tags: ["Machine Learning", "AI", "Data Science", "Python"],
        source_url: "https://example.com/ml-fundamentals",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    email: `friend3-${Date.now()}@notenest.test`,
    password: "TestFriend123!",
    username: "Jordan Taylor",
    notes: [
      {
        title: "Web Security Best Practices",
        content: {
          sections: [
            {
              title: "Authentication and Authorization",
              content:
                "Proper authentication and authorization are fundamental to web security. Authentication verifies who a user is, while authorization determines what they can do. Implement strong password policies, use secure session management, and always validate user permissions on both client and server sides. Never trust client-side validation alone - always verify permissions server-side to prevent unauthorized access.",
            },
            {
              title: "HTTPS and Data Encryption",
              content:
                "Always use HTTPS to encrypt data in transit between clients and servers. This prevents man-in-the-middle attacks and protects sensitive information like passwords and personal data. Use strong encryption algorithms and keep SSL/TLS certificates up to date. For sensitive data at rest, implement database encryption and secure key management practices.",
            },
            {
              title: "Common Vulnerabilities",
              content:
                "Be aware of common web vulnerabilities like SQL injection, cross-site scripting (XSS), cross-site request forgery (CSRF), and insecure direct object references. Use parameterized queries to prevent SQL injection, sanitize user input to prevent XSS, implement CSRF tokens, and always validate and authorize access to resources. Regular security audits and penetration testing help identify and fix vulnerabilities before they're exploited.",
            },
          ],
        },
        tags: ["Security", "Web Development", "Cybersecurity", "Best Practices"],
        source_url: "https://example.com/web-security",
        source_type: "url",
        is_public: true,
      },
      {
        title: "GraphQL vs REST API Design",
        content: {
          sections: [
            {
              title: "REST API Principles",
              content:
                "REST (Representational State Transfer) is an architectural style that uses standard HTTP methods (GET, POST, PUT, DELETE) to interact with resources. REST APIs are stateless, cacheable, and follow a resource-based URL structure. They're simple to understand and implement, work well with HTTP caching, and are widely supported. However, REST can lead to over-fetching or under-fetching of data, requiring multiple requests to get all needed information.",
            },
            {
              title: "GraphQL Advantages",
              content:
                "GraphQL is a query language and runtime for APIs that allows clients to request exactly the data they need. It provides a single endpoint, enables clients to specify the shape of the response, and reduces over-fetching and under-fetching. GraphQL's type system provides strong typing and introspection capabilities, making it easier to build and maintain APIs. However, it can be more complex to implement and may require additional considerations for caching and rate limiting.",
            },
            {
              title: "Choosing the Right Approach",
              content:
                "The choice between REST and GraphQL depends on your specific needs. REST is better for simple CRUD operations, when you want to leverage HTTP caching, or when working with existing REST infrastructure. GraphQL excels when you need flexible data fetching, have complex data relationships, or want to reduce network requests. Many organizations use both, with REST for simple operations and GraphQL for complex queries.",
            },
          ],
        },
        tags: ["API", "GraphQL", "REST", "Backend", "Web Development"],
        source_url: "https://example.com/graphql-rest",
        source_type: "url",
        is_public: true,
      },
    ],
  },
]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const adminClient = createAdminClient()
    const createdFriends: any[] = []

    for (const friendData of placeholderFriends) {
      // Create auth user
      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: friendData.email,
        password: friendData.password,
        email_confirm: true, // Auto-confirm email
      })

      if (authError || !authUser.user) {
        console.error(`Error creating user ${friendData.email}:`, authError)
        continue
      }

      const friendUserId = authUser.user.id

      // Create profile
      const { error: profileError } = await adminClient.from("profiles").insert({
        id: friendUserId,
        username: friendData.username,
        email: friendData.email,
      })

      if (profileError) {
        console.error(`Error creating profile for ${friendData.email}:`, profileError)
        // Continue anyway, might already exist
      }

      // Create accepted friendship (bidirectional)
      const { error: friendshipError1 } = await adminClient.from("friendships").insert({
        user_id: user.id,
        friend_id: friendUserId,
        status: "accepted",
      })

      const { error: friendshipError2 } = await adminClient.from("friendships").insert({
        user_id: friendUserId,
        friend_id: user.id,
        status: "accepted",
      })

      if (friendshipError1 || friendshipError2) {
        console.error(`Error creating friendships for ${friendData.email}:`, friendshipError1 || friendshipError2)
        // Continue anyway
      }

      // Create public notes for this friend
      const notesToInsert = friendData.notes.map((note) => ({
        user_id: friendUserId,
        title: note.title,
        content: note.content,
        tags: note.tags,
        source_url: note.source_url,
        source_type: note.source_type,
        is_public: note.is_public,
      }))

      const { data: insertedNotes, error: notesError } = await adminClient
        .from("notes")
        .insert(notesToInsert)
        .select()

      if (notesError) {
        console.error(`Error creating notes for ${friendData.email}:`, notesError)
      }

      createdFriends.push({
        id: friendUserId,
        username: friendData.username,
        email: friendData.email,
        notesCount: insertedNotes?.length || 0,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdFriends.length} placeholder friends`,
      friends: createdFriends,
    })
  } catch (error) {
    console.error("Error seeding friends:", error)
    return NextResponse.json({ error: "Failed to seed friends", details: String(error) }, { status: 500 })
  }
}

