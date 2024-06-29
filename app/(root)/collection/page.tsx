import QuestionCard from "@/components/cards/QuestionCard";
import Filters from "@/components/shared/Filters";
import NoResult from "@/components/shared/NoResult";
import LocalSearch from "@/components/shared/search/LocalSearch";
import { QuestionFilters } from "@/constants/filter";
import { getSavedQuestions } from "@/lib/actions/user.action";
import { auth } from "@clerk/nextjs/server";
import React from "react";

export default async function Home() {
  const { userId } = auth();
  if (!userId) return null;
  const result = await getSavedQuestions({
    clerkId: userId,
    filter: undefined,
    page: undefined,
    pageSize: undefined,
    searchQuery: undefined,
  });
  return (
    <>
      <h1 className="h1-bold text-dark100_light900">Saved Questions</h1>
      <div className="flex justify-between gap-5 max-sm:flex-col items-center mt-11">
        <LocalSearch
          route="/"
          iconPosition="left"
          imgSrc="/assets/icons/search.svg"
          placeholder="Search for questions..."
          otherClasses="flex-1"
        />
        <Filters
          otherClasses="min-h-[56px] sm:min-w-[170px]"
          filter={QuestionFilters}
        />
      </div>
      <div className="mt-10 flex w-full flex-col gap-6">
        {result.savedQuestions.length > 0 ? (
          // todo:
          result.savedQuestions.map((question: any) => (
            <QuestionCard
              key={question._id}
              _id={JSON.stringify(question._id)}
              answers={question.answers}
              author={question.author}
              createdAt={question.createdAt}
              tags={question.tags}
              title={question.title}
              upvotes={question.upvotes}
              views={question.views}
            />
          ))
        ) : (
          <NoResult
            title="There's no Saved Question to show"
            description="Be the first to break the silence! 🚀 Ask a Question and kickstart the
        discussion. Our query could be the next big thing others learn from. Get
        involved! 💡"
            link="/ask-question"
            linkTitle="Ask a Question"
          />
        )}
      </div>
    </>
  );
}
