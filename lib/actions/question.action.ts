"use server";
import Question from "@/database/question.model";
import { connectDB } from "../mongoose";
import Tag from "@/database/tag.model";
import { revalidatePath } from "next/cache";
import {
  CreateQuestionParams,
  GetQuestionsParams,
  GetQuestionByIdParams,
  QuestionVoteParams,
  ToggleSaveQuestionParams,
  DeleteQuestionParams,
  EditQuestionParams,
  RecommendedParams,
} from "./shared.types";
import User from "@/database/user.model";
import Answer from "@/database/answer.model";
import Interaction from "@/database/interaction.model";
import { IGetQuestions, IQuestionWithAuthorTag } from "@/types";
import { ObjectId } from "mongoose";
import { FilterQuery } from "mongoose";

export const getQuestions = async ({
  page = 1,
  pageSize = 20,
  searchQuery,
  filter,
}: GetQuestionsParams) => {
  try {
    await connectDB();
    const skipAmount = (page - 1) * pageSize;
    let query: any = searchQuery
      ? {
          $or: [
            { title: { $regex: new RegExp(searchQuery, "i") } },
            { content: { $regex: new RegExp(searchQuery, "i") } },
          ],
        }
      : {};

    let sortOptions = {};
    switch (filter) {
      case "newest":
        sortOptions = { createdAt: -1 };
        break;
      case "unanswered":
        query.answers = { $size: 0 };
        break;
      case "frequent":
        sortOptions = { views: -1 };
        break;

      default:
        break;
    }

    let questions = (await Question.find(query)
      .populate({ path: "tags", model: Tag })
      .populate({ path: "author", model: User })
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions)) as unknown as IGetQuestions[];

    const totalQuestions = await Question.countDocuments(query);
    const isNext = totalQuestions > skipAmount + questions.length;
    return { questions, isNext };
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const createQuestion = async ({
  title,
  content,
  author,
  tags,
  path,
}: CreateQuestionParams) => {
  try {
    await connectDB();
    let question = await Question.create({
      title,
      content,
      author,
    });
    const documentTags = [];
    // for each tag in tags
    for (const tag of tags) {
      /* 
    if there is already present a tag document w/ specific name, append question._id to it 
    otherwise create a new one set its name:tag and push question._id to it 
    */
      const newTag = await Tag.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${tag}$`, "i") } },
        { $setOnInsert: { name: tag }, $push: { questions: question._id } },
        { upsert: true, new: true }
      );
      documentTags.push(newTag._id);
    }
    await question.updateOne({
      tags: documentTags,
    });
    // creating interaction
    await Interaction.create({
      user: author,
      question: question._id,
      tags: documentTags,
      action: "ask_question",
    });

    // increasing user's reputation
    await User.findByIdAndUpdate(author, { $inc: { reputation: 5 } });
    revalidatePath(path);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const getQuestionById = async ({
  questionId,
}: GetQuestionByIdParams) => {
  try {
    await connectDB();
    const question = (await Question.findById(questionId)
      .populate({ path: "tags", model: Tag, select: "_id name" })
      .populate({
        path: "author",
        model: User,
        select: "_id clerkId name picture",
      })) as unknown as IQuestionWithAuthorTag;
    return question;
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const downvoteQuestion = async ({
  hasDownvoted,
  hasUpvoted,
  path,
  questionId,
  userId,
}: QuestionVoteParams) => {
  try {
    await connectDB();
    let updateQuery = {};
    if (hasDownvoted) {
      updateQuery = {
        $pull: { downvotes: userId },
      };
    } else if (hasUpvoted) {
      updateQuery = {
        $pull: { upvotes: userId },
        $push: { downvotes: userId },
      };
    } else {
      updateQuery = { $addToSet: { downvotes: userId } };
    }
    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
      new: true,
    });
    if (!question) throw new Error("Question not found!");

    //increment authors reputation
    await User.findByIdAndUpdate(userId, {
      $inc: { reputation: hasDownvoted ? -1 : 1 },
    });
    // increment authors reputation for gettings vote
    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: hasDownvoted ? -10 : 10 },
    });
    revalidatePath(path);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const upvoteQuestion = async ({
  hasDownvoted,
  hasUpvoted,
  path,
  questionId,
  userId,
}: QuestionVoteParams) => {
  try {
    await connectDB();
    let updateQuery = {};
    if (hasDownvoted) {
      updateQuery = {
        $pull: { downvotes: userId },
        $push: { upvotes: userId },
      };
    } else if (hasUpvoted) {
      updateQuery = { $pull: { upvotes: userId } };
    } else {
      updateQuery = { $addToSet: { upvotes: userId } };
    }
    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {
      new: true,
    });
    if (!question) throw new Error("Question not found!");
    //increment authors reputation
    await User.findByIdAndUpdate(userId, {
      $inc: { reputation: hasUpvoted ? -1 : 1 },
    });
    // increment authors reputation for gettings vote
    await User.findByIdAndUpdate(question.author, {
      $inc: { reputation: hasUpvoted ? -10 : 10 },
    });
    revalidatePath(path);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const toggleSaveQuestion = async ({
  path,
  questionId,
  userId,
}: ToggleSaveQuestionParams) => {
  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) throw new Error("user not found!");

    let updateQuery = {};
    if (user.saved.includes(questionId as unknown as ObjectId)) {
      updateQuery = { $pull: { saved: questionId } };
    } else {
      updateQuery = { $addToSet: { saved: questionId } };
    }
    await User.updateOne({ _id: userId }, updateQuery, { new: true });
    revalidatePath(path);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};
export const deleteQuestion = async ({
  path,
  questionId,
}: DeleteQuestionParams) => {
  try {
    await connectDB();
    await Question.deleteOne({ _id: questionId });
    await Answer.deleteMany({ question: questionId });
    await Interaction.deleteMany({ question: questionId });
    await Tag.updateMany(
      { question: questionId },
      { $pull: { questions: questionId } }
    );
    revalidatePath(path);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const editQuestion = async ({
  path,
  questionId,
  content,
  title,
}: EditQuestionParams) => {
  try {
    await connectDB();
    const question = await Question.findById(questionId);
    if (!question) throw new Error("Question not found!");
    question.title = title;
    question.content = content;
    await question.save();
    revalidatePath(path);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};
export const getHotQuestions = async () => {
  try {
    await connectDB();
    const questions = await Question.find()
      .sort({ upvotes: -1, views: -1 })
      .limit(5);
    return questions;
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};
// getRecommendedQuestions
export async function getRecommendedQuestions({
  userId,
  page = 1,
  pageSize = 20,
  searchQuery,
}: RecommendedParams) {
  try {
    await connectDB();

    // find user
    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      throw new Error("user not found");
    }

    const skipAmount = (page - 1) * pageSize;

    // Find the user's interactions
    const userInteractions = await Interaction.find({ user: user._id })
      .populate("tags")
      .exec();

    // Extract tags from user's interactions
    const userTags = userInteractions.reduce((tags, interaction) => {
      if (interaction.tags) {
        tags = tags.concat(interaction.tags as any);
      }
      return tags;
    }, []);
    // Get distinct tag IDs from user's interactions
    const distinctUserTagIds = [
      // @ts-ignore
      ...new Set(userTags.map((tag: any) => tag._id)),
    ];
    const query: FilterQuery<typeof Question> = {
      $and: [
        { tags: { $in: distinctUserTagIds } }, // Questions with user's tags
        { author: { $ne: user._id } }, // Exclude user's own questions
      ],
    };

    if (searchQuery) {
      query.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { content: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const totalQuestions = await Question.countDocuments(query);

    const recommendedQuestions = (await Question.find(query)
      .populate({
        path: "tags",
        model: Tag,
      })
      .populate({
        path: "author",
        model: User,
      })
      .skip(skipAmount)
      .limit(pageSize)) as unknown as IQuestionWithAuthorTag[];

    const isNext = totalQuestions > skipAmount + recommendedQuestions.length;

    return { questions: recommendedQuestions, isNext };
  } catch (error) {
    console.error("Error getting recommended questions:", error);
    throw error;
  }
}
