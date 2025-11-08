import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

// Sample placeholder notes with longer content
const placeholderNotes = [
  {
    title: "Comprehensive Guide to Machine Learning and Deep Learning",
    content: {
      sections: [
        {
          title: "Introduction to Machine Learning",
          content:
            "Machine Learning is a transformative subset of artificial intelligence that has revolutionized how we approach problem-solving in the digital age. At its core, machine learning enables computer systems to learn and improve from experience without being explicitly programmed for every scenario. This paradigm shift has opened up unprecedented possibilities across industries, from healthcare and finance to transportation and entertainment. The fundamental principle behind machine learning is pattern recognition - algorithms analyze vast amounts of data to identify patterns, make predictions, and improve their performance over time through iterative learning processes.",
        },
        {
          title: "Types of Machine Learning Algorithms",
          content:
            "Machine learning algorithms can be broadly categorized into three main types, each serving different purposes and use cases. Supervised learning involves training models on labeled datasets where the correct answers are provided, enabling the algorithm to learn the mapping between inputs and outputs. Common supervised learning algorithms include linear regression for predicting continuous values, logistic regression for binary classification, decision trees for interpretable rule-based decisions, random forests for robust ensemble predictions, and support vector machines for complex boundary classification. Unsupervised learning, on the other hand, works with unlabeled data to discover hidden patterns and structures. Key techniques include K-means clustering for grouping similar data points, hierarchical clustering for nested groupings, principal component analysis for dimensionality reduction, and association rule learning for finding relationships in data. Reinforcement learning represents a third paradigm where agents learn optimal actions through trial and error, receiving rewards or penalties for their decisions. This approach has been particularly successful in game playing, robotics, and autonomous systems where the agent must learn to navigate complex environments and make sequential decisions.",
        },
        {
          title: "Deep Learning and Neural Networks",
          content:
            "Deep learning represents a sophisticated subset of machine learning that mimics the structure and function of the human brain through artificial neural networks. These networks consist of multiple layers of interconnected nodes (neurons) that process information in increasingly abstract ways. The depth of these networks - hence the term 'deep learning' - allows them to automatically learn hierarchical representations of data, from simple features at lower layers to complex patterns at higher layers. Convolutional Neural Networks (CNNs) have revolutionized computer vision tasks, enabling machines to recognize objects, faces, and scenes with remarkable accuracy. Recurrent Neural Networks (RNNs) and their advanced variants like Long Short-Term Memory (LSTM) networks and Gated Recurrent Units (GRUs) excel at processing sequential data such as text, speech, and time series. Transformer architectures, introduced in 2017, have transformed natural language processing, enabling models like GPT and BERT to understand and generate human-like text with unprecedented sophistication. The training of deep neural networks involves forward propagation, where data flows through the network to make predictions, and backpropagation, where errors are propagated backward to adjust the network's weights and biases, gradually improving its performance through gradient descent optimization.",
        },
        {
          title: "Real-World Applications and Impact",
          content:
            "The practical applications of machine learning and deep learning span virtually every industry and aspect of modern life. In healthcare, machine learning models assist in medical diagnosis, drug discovery, personalized treatment plans, and medical image analysis, potentially saving lives through early detection of diseases. The financial sector leverages these technologies for fraud detection, algorithmic trading, credit scoring, and risk assessment, enabling more accurate and efficient financial services. Autonomous vehicles rely heavily on machine learning for object detection, path planning, and decision-making, bringing us closer to fully self-driving cars. E-commerce and recommendation systems use collaborative filtering and content-based algorithms to personalize user experiences and increase engagement. Natural language processing applications enable virtual assistants, language translation, sentiment analysis, and automated content generation. Computer vision applications include facial recognition, medical imaging, quality control in manufacturing, and augmented reality experiences. The impact of these technologies continues to grow as computational power increases, algorithms become more sophisticated, and datasets become larger and more accessible.",
        },
        {
          title: "Challenges and Future Directions",
          content:
            "Despite remarkable progress, machine learning and deep learning face several significant challenges that researchers and practitioners continue to address. Data quality and quantity remain critical concerns - models require large, diverse, and accurately labeled datasets to perform well, which can be expensive and time-consuming to acquire. Overfitting, where models memorize training data but fail to generalize to new data, requires careful regularization techniques and validation strategies. Interpretability and explainability are increasingly important, especially in high-stakes applications like healthcare and finance, where understanding model decisions is crucial for trust and accountability. Bias and fairness issues can perpetuate or amplify societal inequalities if training data contains biases, requiring careful attention to dataset composition and model evaluation. Computational requirements for training large deep learning models can be substantial, raising concerns about energy consumption and environmental impact. Privacy concerns arise when models are trained on sensitive personal data, leading to the development of techniques like federated learning and differential privacy. Looking forward, emerging trends include few-shot and zero-shot learning to reduce data requirements, transfer learning to leverage pre-trained models, automated machine learning (AutoML) to democratize access, and the integration of machine learning with other technologies like quantum computing and edge computing. The field continues to evolve rapidly, promising even more transformative applications in the years to come.",
        },
        {
          title: "Best Practices and Implementation",
          content:
            "Successfully implementing machine learning solutions requires careful attention to best practices throughout the development lifecycle. Data preprocessing is crucial - cleaning, normalizing, and transforming data can significantly impact model performance. Feature engineering, the process of creating meaningful input variables, often requires domain expertise and can be as important as algorithm selection. Model selection should be based on the specific problem characteristics, data availability, and performance requirements. Cross-validation techniques help ensure models generalize well to unseen data, while proper train-validation-test splits prevent data leakage and provide reliable performance estimates. Hyperparameter tuning, the process of optimizing algorithm settings, can dramatically improve model performance but requires computational resources and careful experimentation. Regularization techniques like L1 and L2 regularization, dropout, and early stopping help prevent overfitting. Model evaluation should use appropriate metrics - accuracy for balanced classification problems, precision and recall for imbalanced datasets, F1-score for harmonic mean, and area under the ROC curve for binary classification. Continuous monitoring and retraining are essential as data distributions change over time, a phenomenon known as concept drift. MLOps practices, combining machine learning with DevOps principles, enable scalable, reliable, and maintainable ML systems in production environments.",
        },
      ],
    },
    tags: ["Machine Learning", "Deep Learning", "AI", "Neural Networks", "Computer Science", "Technology"],
    source_url: "https://example.com/ml-deep-learning-guide",
    source_type: "url",
    is_public: true,
  },
  {
    title: "The Complete History of World War II: Causes, Events, and Consequences",
    content: {
      sections: [
        {
          title: "The Road to War: Causes and Precursors",
          content:
            "World War II, the deadliest conflict in human history, did not emerge in isolation but was the culmination of decades of political, economic, and social tensions. The harsh terms of the Treaty of Versailles, which ended World War I, imposed severe reparations and territorial losses on Germany, creating deep resentment and economic hardship that fueled nationalist movements. The global economic depression of the 1930s further destabilized democratic governments and created conditions ripe for authoritarian regimes. In Germany, Adolf Hitler and the Nazi Party rose to power by exploiting economic desperation, promoting extreme nationalism, and scapegoating minority groups, particularly Jews. The policy of appeasement pursued by Britain and France, most notably at the Munich Conference in 1938, emboldened aggressive expansionist policies. Japan's imperial ambitions in Asia, driven by resource needs and militaristic ideology, led to the invasion of Manchuria in 1931 and full-scale war with China in 1937. Italy, under Benito Mussolini's fascist regime, sought to recreate the Roman Empire through conquest in Africa and the Mediterranean. These aggressive actions, combined with the failure of the League of Nations to maintain collective security, created a powder keg that would explode in September 1939.",
        },
        {
          title: "The European Theater: Blitzkrieg and Occupation",
          content:
            "The war in Europe began on September 1, 1939, when Germany invaded Poland, employing the revolutionary Blitzkrieg (lightning war) strategy that combined rapid armored advances, air superiority, and coordinated infantry attacks. Britain and France declared war on Germany two days later, but Poland fell within weeks. The following months saw the 'Phoney War,' a period of limited military action, until Germany launched its western offensive in May 1940. The fall of France in just six weeks shocked the world and demonstrated the effectiveness of German military tactics. The Battle of Britain, fought in the skies over England from July to October 1940, marked a crucial turning point as the Royal Air Force successfully defended against the Luftwaffe, preventing a German invasion. Operation Barbarossa, the massive German invasion of the Soviet Union in June 1941, opened the largest and bloodiest theater of the war. The Eastern Front would claim millions of lives and see some of the most brutal fighting in human history. The Battle of Stalingrad (1942-1943) became a symbol of Soviet resistance and marked the beginning of Germany's retreat from the east. Meanwhile, German forces occupied much of Europe, implementing brutal occupation policies, establishing concentration camps, and systematically persecuting and murdering millions of Jews, Roma, Slavs, and other groups in the Holocaust - one of history's greatest crimes against humanity.",
        },
        {
          title: "The Pacific Theater: Island Hopping and Naval Warfare",
          content:
            "The Pacific War began with Japan's surprise attack on Pearl Harbor on December 7, 1941, which brought the United States into the conflict. This attack, while initially devastating, ultimately proved to be a strategic miscalculation that awakened American industrial and military might. The early months of 1942 saw Japan's rapid expansion across Southeast Asia and the Pacific, capturing territories from the Philippines to Singapore to the Dutch East Indies. However, the tide began to turn with key Allied victories. The Battle of Midway in June 1942, where American naval forces destroyed four Japanese aircraft carriers, marked a decisive turning point in the Pacific. The subsequent island-hopping campaign, led by General Douglas MacArthur and Admiral Chester Nimitz, involved capturing strategic islands while bypassing heavily fortified Japanese positions. The Battle of Guadalcanal (1942-1943) was the first major Allied offensive in the Pacific and demonstrated the ferocity of jungle warfare. The Battle of Leyte Gulf in October 1944 was the largest naval battle in history and effectively destroyed Japanese naval power. The capture of Iwo Jima and Okinawa in 1945 brought American forces within striking distance of the Japanese home islands, but at tremendous cost. These battles, along with the strategic bombing campaign that devastated Japanese cities, set the stage for the war's conclusion.",
        },
        {
          title: "The Holocaust and Genocide",
          content:
            "The Holocaust stands as one of the most horrific chapters in human history, representing the systematic persecution and murder of six million Jews and millions of others by Nazi Germany and its collaborators. Beginning with discriminatory laws and escalating to mass murder, the Holocaust unfolded in stages. The Nuremberg Laws of 1935 stripped German Jews of citizenship and basic rights. Kristallnacht (Night of Broken Glass) in 1938 saw coordinated attacks on Jewish businesses, synagogues, and homes. As Germany expanded, ghettos were established in occupied territories, confining Jewish populations in overcrowded, disease-ridden conditions. The Wannsee Conference in 1942 formalized the 'Final Solution' - the systematic extermination of European Jewry. Death camps like Auschwitz-Birkenau, Treblinka, and Sobibor became industrial-scale killing facilities, using gas chambers and crematoria to murder thousands daily. Beyond Jews, the Nazis targeted Roma, disabled individuals, homosexuals, political dissidents, and Slavic peoples. The total death toll of the Holocaust and related Nazi crimes is estimated at 11-17 million people. The liberation of concentration camps by Allied forces in 1945 revealed the full horror of these crimes to the world, leading to the Nuremberg Trials and the establishment of international laws against genocide and crimes against humanity.",
        },
        {
          title: "D-Day and the Liberation of Europe",
          content:
            "Operation Overlord, the Allied invasion of Nazi-occupied Western Europe, began on June 6, 1944 - a date forever known as D-Day. This massive amphibious assault, the largest in history, involved over 150,000 Allied troops landing on the beaches of Normandy, France. Months of meticulous planning, deception operations (including the phantom First U.S. Army Group), and intelligence gathering preceded the invasion. The landings occurred across five beaches: Utah, Omaha, Gold, Juno, and Sword. American forces faced particularly fierce resistance at Omaha Beach, where German defenses in the cliffs above caused heavy casualties. Despite initial setbacks, Allied forces established beachheads and began the push inland. The Battle of Normandy lasted for months, with intense fighting in the hedgerows of the French countryside. The breakout at Saint-Lô and the Falaise Pocket trapped and destroyed much of the German Seventh Army. Paris was liberated in August 1944, and by September, most of France and Belgium were free. The subsequent Battle of the Bulge in December 1944, Germany's last major offensive in the west, temporarily slowed but could not stop the Allied advance. By spring 1945, Allied forces were crossing the Rhine River and advancing into Germany itself, meeting Soviet forces advancing from the east.",
        },
        {
          title: "The End of the War and Its Aftermath",
          content:
            "The final months of World War II saw the collapse of the Axis powers and the dawn of the atomic age. In Europe, Soviet forces reached Berlin in April 1945, and Hitler committed suicide in his bunker on April 30. Germany surrendered unconditionally on May 8, 1945 (V-E Day). In the Pacific, the war continued with increasingly bloody battles. The atomic bombings of Hiroshima on August 6 and Nagasaki on August 9, 1945, brought the war to a sudden end, with Japan surrendering on August 15 (V-J Day). The use of atomic weapons, while ending the war, opened a new era of nuclear weapons and Cold War tensions. The war's aftermath was profound and far-reaching. The United Nations was established in 1945 to prevent future global conflicts and promote international cooperation. Europe lay in ruins, with millions dead, cities destroyed, and economies shattered. The Nuremberg and Tokyo Trials established principles of international justice and individual accountability for war crimes. The war accelerated decolonization movements, as European powers could no longer maintain their empires. The state of Israel was established in 1948, partly in response to the Holocaust. The division of Germany and the emergence of the Iron Curtain set the stage for the Cold War, which would dominate international relations for the next four decades. The war's legacy continues to shape our world today, from international institutions and laws to ongoing conflicts and the memory of those who suffered and died.",
        },
      ],
    },
    tags: ["History", "World War II", "Military History", "20th Century", "Politics", "Social Studies"],
    source_url: "https://example.com/ww2-complete-history",
    source_type: "url",
    is_public: true,
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
    // Insert all placeholder notes
    const notesToInsert = placeholderNotes.map((note) => ({
      user_id: user.id,
      title: note.title,
      content: note.content,
      tags: note.tags,
      source_url: note.source_url,
      source_type: note.source_type,
      is_public: note.is_public,
    }))

    const { data: insertedNotes, error: insertError } = await supabase
      .from("notes")
      .insert(notesToInsert)
      .select()

    if (insertError) {
      console.error("Error inserting notes:", insertError)
      return NextResponse.json({ error: "Failed to insert notes", details: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${insertedNotes?.length || 0} placeholder notes`,
      notes: insertedNotes,
    })
  } catch (error) {
    console.error("Error seeding notes:", error)
    return NextResponse.json({ error: "Failed to seed notes" }, { status: 500 })
  }
}

