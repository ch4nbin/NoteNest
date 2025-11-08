import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

const nonFriendUser = {
  username: "Morgan Kim",
  password: "TestNonFriend123!",
  notes: [
    {
      title: "Advanced TypeScript Patterns",
      content: {
        sections: [
          {
            title: "Generics in Depth",
            content:
              "TypeScript generics allow you to create reusable components that work with multiple types. They provide a way to make components work with any data type and not restrict to one data type. Generics use type variables, which are a special kind of variable that works on types rather than values. This enables you to write code that is both flexible and type-safe, allowing functions and classes to work with different types while maintaining compile-time type checking.",
          },
          {
            title: "Conditional Types",
            content:
              "Conditional types in TypeScript allow you to select types based on conditions, similar to conditional expressions in JavaScript. They use the syntax T extends U ? X : Y, which means if T is assignable to U, the type is X, otherwise it's Y. This powerful feature enables you to create complex type transformations and type inference patterns that can adapt based on the input types, making your type system more expressive and precise.",
          },
          {
            title: "Utility Types",
            content:
              "TypeScript provides several built-in utility types that help with common type transformations. These include Partial<T> to make all properties optional, Required<T> to make all properties required, Pick<T, K> to select specific properties, Omit<T, K> to exclude specific properties, and many more. Understanding and using these utility types can significantly reduce boilerplate code and make your type definitions more maintainable and expressive.",
          },
        ],
      },
      tags: ["TypeScript", "Programming", "Web Development"],
      source_url: "https://example.com/typescript-patterns",
      source_type: "url",
      is_public: true,
    },
    {
      title: "Docker Containerization Guide",
      content: {
        sections: [
          {
            title: "What is Docker?",
            content:
              "Docker is a platform that uses containerization technology to package applications and their dependencies into lightweight, portable containers. These containers can run consistently across different environments, from development to production. Docker solves the 'it works on my machine' problem by ensuring that applications run the same way everywhere, regardless of the underlying infrastructure.",
          },
          {
            title: "Dockerfile Best Practices",
            content:
              "When writing Dockerfiles, it's important to follow best practices for security, performance, and maintainability. Use multi-stage builds to reduce image size, leverage layer caching by ordering commands from least to most frequently changing, use specific version tags instead of 'latest', minimize the number of layers, and run containers as non-root users when possible. These practices help create efficient, secure, and maintainable container images.",
          },
          {
            title: "Docker Compose",
            content:
              "Docker Compose is a tool for defining and running multi-container Docker applications. It uses a YAML file to configure application services, networks, and volumes, making it easy to orchestrate complex applications with multiple components. With Docker Compose, you can start all services with a single command, manage dependencies between services, and maintain consistent environments across different stages of development.",
          },
        ],
      },
      tags: ["Docker", "DevOps", "Containers", "Infrastructure"],
      source_url: "https://example.com/docker-guide",
      source_type: "url",
      is_public: true,
    },
  ],
}

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

    // Generate email from username (convert to lowercase, replace spaces with hyphens)
    const emailBase = nonFriendUser.username.toLowerCase().replace(/\s+/g, "-")
    const uniqueEmail = `${emailBase}@notenest.test`

    // Create auth user
    const { data: authUser, error: authCreateError } = await adminClient.auth.admin.createUser({
      email: uniqueEmail,
      password: nonFriendUser.password,
      email_confirm: true, // Auto-confirm email
    })

    if (authCreateError || !authUser.user) {
      console.error(`Error creating user ${uniqueEmail}:`, authCreateError)
      return NextResponse.json({ error: "Failed to create user", details: authCreateError?.message }, { status: 500 })
    }

    const newUserId = authUser.user.id

    // Create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      id: newUserId,
      username: nonFriendUser.username,
      email: uniqueEmail,
    })

    if (profileError) {
      console.error(`Error creating profile for ${uniqueEmail}:`, profileError)
      // Continue anyway, might already exist
    }

    // Create public notes for this user (but NO friendship)
    const notesToInsert = nonFriendUser.notes.map((note) => ({
      user_id: newUserId,
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
      console.error(`Error creating notes for ${uniqueEmail}:`, notesError)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created non-friend user "${nonFriendUser.username}" with ${notesToInsert.length} notes.`,
      user: {
        id: newUserId,
        username: nonFriendUser.username,
        email: uniqueEmail,
        notesCount: notesToInsert.length,
      },
    })
  } catch (error) {
    console.error("Error seeding non-friend user:", error)
    return NextResponse.json({ error: "Failed to seed non-friend user" }, { status: 500 })
  }
}

