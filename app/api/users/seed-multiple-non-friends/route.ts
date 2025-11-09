import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

const nonFriendUsers = [
  {
    username: "Emma Watson",
    notes: [
      {
        title: "Introduction to Quantum Computing",
        content: {
          sections: [
            {
              title: "What is Quantum Computing?",
              content:
                "Quantum computing is a revolutionary computing paradigm that leverages quantum mechanical phenomena like superposition and entanglement to perform computations. Unlike classical computers that use bits (0 or 1), quantum computers use quantum bits or qubits, which can exist in multiple states simultaneously. This allows quantum computers to solve certain problems exponentially faster than classical computers.",
            },
            {
              title: "Key Concepts",
              content:
                "Superposition allows qubits to be in a combination of 0 and 1 states simultaneously. Entanglement creates correlations between qubits that persist even when separated. Quantum interference enables quantum algorithms to amplify correct answers and cancel out incorrect ones. These properties make quantum computers particularly powerful for cryptography, optimization, and molecular simulation.",
            },
          ],
        },
        tags: ["Quantum Computing", "Physics", "Technology"],
        source_url: "https://example.com/quantum-computing",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "David Park",
    notes: [
      {
        title: "Machine Learning Fundamentals",
        content: {
          sections: [
            {
              title: "Overview",
              content:
                "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can identify patterns in data and make predictions or decisions based on that data.",
            },
            {
              title: "Types of Learning",
              content:
                "Supervised learning uses labeled training data to learn a mapping from inputs to outputs. Unsupervised learning finds hidden patterns in unlabeled data. Reinforcement learning learns through interaction with an environment, receiving rewards or penalties for actions.",
            },
          ],
        },
        tags: ["Machine Learning", "AI", "Data Science"],
        source_url: "https://example.com/ml-fundamentals",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Sophia Martinez",
    notes: [
      {
        title: "Web Development Best Practices",
        content: {
          sections: [
            {
              title: "Code Organization",
              content:
                "Organize code into logical modules and components. Use consistent naming conventions and follow the DRY (Don't Repeat Yourself) principle. Implement proper error handling and logging throughout your application.",
            },
            {
              title: "Performance Optimization",
              content:
                "Minimize HTTP requests, optimize images, use lazy loading, and implement caching strategies. Code splitting and tree shaking can significantly reduce bundle sizes. Monitor and optimize database queries for better performance.",
            },
          ],
        },
        tags: ["Web Development", "Programming", "Best Practices"],
        source_url: "https://example.com/web-dev-practices",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "James Anderson",
    notes: [
      {
        title: "Cloud Architecture Patterns",
        content: {
          sections: [
            {
              title: "Microservices",
              content:
                "Microservices architecture breaks applications into small, independent services that communicate over well-defined APIs. Each service can be developed, deployed, and scaled independently, improving flexibility and resilience.",
            },
            {
              title: "Serverless Computing",
              content:
                "Serverless computing allows developers to build and run applications without managing servers. Functions are executed in response to events, and you only pay for the compute time you consume. This model simplifies deployment and scaling.",
            },
          ],
        },
        tags: ["Cloud Computing", "Architecture", "DevOps"],
        source_url: "https://example.com/cloud-patterns",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Olivia Chen",
    notes: [
      {
        title: "Data Structures and Algorithms",
        content: {
          sections: [
            {
              title: "Common Data Structures",
              content:
                "Arrays provide O(1) access but O(n) insertion/deletion. Linked lists offer O(1) insertion/deletion but O(n) access. Hash tables provide average O(1) operations. Trees and graphs enable efficient hierarchical and network representations.",
            },
            {
              title: "Algorithm Complexity",
              content:
                "Time complexity describes how runtime grows with input size. Space complexity measures memory usage. Big O notation expresses worst-case complexity. Understanding complexity helps choose the right algorithm for each problem.",
            },
          ],
        },
        tags: ["Algorithms", "Computer Science", "Programming"],
        source_url: "https://example.com/data-structures",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Michael Brown",
    notes: [
      {
        title: "Cybersecurity Essentials",
        content: {
          sections: [
            {
              title: "Threats and Vulnerabilities",
              content:
                "Common threats include malware, phishing, DDoS attacks, and data breaches. Vulnerabilities can exist in software, hardware, or human processes. Regular security audits and penetration testing help identify and address weaknesses.",
            },
            {
              title: "Security Best Practices",
              content:
                "Implement strong authentication and authorization. Use encryption for data at rest and in transit. Keep software updated with security patches. Educate users about social engineering attacks. Implement defense in depth with multiple security layers.",
            },
          ],
        },
        tags: ["Cybersecurity", "Security", "IT"],
        source_url: "https://example.com/cybersecurity",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Isabella Taylor",
    notes: [
      {
        title: "Mobile App Development",
        content: {
          sections: [
            {
              title: "Platform Considerations",
              content:
                "Native apps offer best performance and platform integration but require separate codebases. Cross-platform frameworks like React Native and Flutter enable code sharing while maintaining good performance. Progressive Web Apps provide web-based mobile experiences.",
            },
            {
              title: "User Experience",
              content:
                "Design for touch interactions and various screen sizes. Optimize for battery life and network conditions. Implement offline functionality where possible. Follow platform-specific design guidelines for intuitive user experiences.",
            },
          ],
        },
        tags: ["Mobile Development", "App Development", "UX"],
        source_url: "https://example.com/mobile-dev",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Ryan Thompson",
    notes: [
      {
        title: "GraphQL vs REST API",
        content: {
          sections: [
            {
              title: "REST API Overview",
              content:
                "REST (Representational State Transfer) is an architectural style for designing networked applications. It uses standard HTTP methods (GET, POST, PUT, DELETE) and stateless communication. REST APIs are simple, cacheable, and work well with existing web infrastructure.",
            },
            {
              title: "GraphQL Advantages",
              content:
                "GraphQL allows clients to request exactly the data they need, reducing over-fetching and under-fetching. It provides a single endpoint, strong typing, and real-time subscriptions. GraphQL enables better developer experience with introspection and powerful tooling.",
            },
          ],
        },
        tags: ["GraphQL", "REST", "API Design", "Backend"],
        source_url: "https://example.com/graphql-rest",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Lily Zhang",
    notes: [
      {
        title: "Neural Networks Fundamentals",
        content: {
          sections: [
            {
              title: "Basic Architecture",
              content:
                "Neural networks consist of layers of interconnected nodes (neurons). Input layers receive data, hidden layers process information, and output layers produce results. Each connection has a weight that adjusts during training to minimize error.",
            },
            {
              title: "Training Process",
              content:
                "Training involves forward propagation (data flows through the network) and backpropagation (errors flow backward to update weights). Gradient descent optimizes the weights to minimize the loss function. Learning rate controls how quickly the network adapts.",
            },
          ],
        },
        tags: ["Neural Networks", "Machine Learning", "AI", "Deep Learning"],
        source_url: "https://example.com/neural-networks",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Noah Williams",
    notes: [
      {
        title: "Kubernetes Orchestration",
        content: {
          sections: [
            {
              title: "Container Orchestration",
              content:
                "Kubernetes automates deployment, scaling, and management of containerized applications. It provides service discovery, load balancing, storage orchestration, and automated rollouts and rollbacks. Kubernetes abstracts away infrastructure complexity.",
            },
            {
              title: "Key Concepts",
              content:
                "Pods are the smallest deployable units, containing one or more containers. Services provide stable networking for pods. Deployments manage replica sets and enable rolling updates. ConfigMaps and Secrets manage configuration and sensitive data.",
            },
          ],
        },
        tags: ["Kubernetes", "DevOps", "Containers", "Orchestration"],
        source_url: "https://example.com/kubernetes",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Ava Rodriguez",
    notes: [
      {
        title: "UI/UX Design Principles",
        content: {
          sections: [
            {
              title: "User-Centered Design",
              content:
                "User-centered design prioritizes user needs and goals throughout the design process. It involves user research, personas, user journeys, and iterative testing. Understanding user context and behavior is essential for creating effective interfaces.",
            },
            {
              title: "Visual Hierarchy",
              content:
                "Visual hierarchy guides users' attention through size, color, contrast, and spacing. Important elements should be prominent, while secondary information should be de-emphasized. Consistent typography and spacing create cohesive, readable interfaces.",
            },
          ],
        },
        tags: ["UI/UX", "Design", "User Experience", "Interface Design"],
        source_url: "https://example.com/ui-ux-design",
        source_type: "url",
        is_public: true,
      },
    ],
  },
  {
    username: "Ethan Lee",
    notes: [
      {
        title: "Blockchain Technology Basics",
        content: {
          sections: [
            {
              title: "What is Blockchain?",
              content:
                "Blockchain is a distributed ledger technology that maintains a continuously growing list of records (blocks) linked and secured using cryptography. Each block contains a hash of the previous block, creating an immutable chain. This ensures data integrity without a central authority.",
            },
            {
              title: "Key Features",
              content:
                "Decentralization removes the need for intermediaries. Immutability ensures records cannot be altered retroactively. Transparency allows all participants to view the ledger. Consensus mechanisms like Proof of Work or Proof of Stake validate transactions.",
            },
          ],
        },
        tags: ["Blockchain", "Cryptocurrency", "Distributed Systems", "Technology"],
        source_url: "https://example.com/blockchain",
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
    const createdUsers: any[] = []

    for (const userData of nonFriendUsers) {
      // Generate email from username (convert to lowercase, replace spaces with hyphens)
      const emailBase = userData.username.toLowerCase().replace(/\s+/g, "-")
      const uniqueEmail = `${emailBase}@notenest.test`

      // Create auth user
      const { data: authUser, error: authCreateError } = await adminClient.auth.admin.createUser({
        email: uniqueEmail,
        password: "TestUser123!",
        email_confirm: true,
      })

      if (authCreateError || !authUser.user) {
        console.error(`Error creating user ${uniqueEmail}:`, authCreateError)
        continue
      }

      const newUserId = authUser.user.id

      // Create profile
      const { error: profileError } = await adminClient.from("profiles").insert({
        id: newUserId,
        username: userData.username,
        email: uniqueEmail,
      })

      if (profileError) {
        console.error(`Error creating profile for ${uniqueEmail}:`, profileError)
        // Continue anyway
      }

      // Create public notes for this user (but NO friendship)
      const notesToInsert = userData.notes.map((note) => ({
        user_id: newUserId,
        title: note.title,
        content: note.content,
        tags: note.tags,
        source_url: note.source_url,
        source_type: note.source_type,
        is_public: note.is_public,
      }))

      const { error: notesError } = await adminClient.from("notes").insert(notesToInsert)

      if (notesError) {
        console.error(`Error creating notes for ${uniqueEmail}:`, notesError)
      }

      createdUsers.push({
        id: newUserId,
        username: userData.username,
        email: uniqueEmail,
        notesCount: notesToInsert.length,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdUsers.length} non-friend users`,
      users: createdUsers,
    })
  } catch (error) {
    console.error("Error seeding non-friend users:", error)
    return NextResponse.json({ error: "Failed to seed non-friend users" }, { status: 500 })
  }
}

