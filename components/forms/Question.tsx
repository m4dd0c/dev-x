"use client";
import React, { useRef, useState } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { QuestionSchema } from "@/lib/validations";
import { z } from "zod";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { createQuestion } from "@/lib/actions/question.action";
import { usePathname, useRouter } from "next/navigation";
//TODO:
const type: "edit" | "create" = "create";

const Question = ({ userId }: { userId: string }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const editorRef = useRef<null | Editor>(null);
  const form = useForm<z.infer<typeof QuestionSchema>>({
    resolver: zodResolver(QuestionSchema),
    defaultValues: {
      explanation: "",
      tags: [],
      title: "",
    },
  });

  async function onSubmit(values: z.infer<typeof QuestionSchema>) {
    setIsPending(true);
    try {
      await createQuestion({
        title: values.title,
        tags: values.tags,
        content: values.explanation,
        author: JSON.parse(userId),
        path: pathname,
      });
      // redirecting user
      router.push("/");
    } catch (error: any) {
      console.error(error.message);
      throw new Error(error.message);
    } finally {
      setIsPending(false);
    }
  }

  const handleTagRemove = (tag: string, field: any) => {
    const newTags = field.value.filter((t: string) => t !== tag);
    form.setValue("tags", newTags);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: any
  ) => {
    if (e.key === "Enter" && field.name === "tags") {
      e.preventDefault();
      if (field.value.length === 3) {
        return form.setError("tags", {
          type: "required",
          message: "Tags can at most contain 3 tag values",
        });
      }
      const tagInput = e.target as HTMLInputElement;
      const tagValue = tagInput.value.trim();
      if (tagValue !== "") {
        if (tagValue.length > 15) {
          return form.setError("tags", {
            type: "required",
            message: "Tag must be less than 15 characters.",
          });
        }
        if (!field.value.includes(tagValue as never)) {
          form.setValue("tags", [...field.value, tagValue]);
          tagInput.value = "";
          form.clearErrors("tags");
        }
      } else {
        form.trigger();
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-10 w-full"
      >
        {/* title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="flex flex-col w-full">
              <FormLabel className="paragraph-semibold text-dark400_light800">
                Question Title <span className="text-primary-500">*</span>
              </FormLabel>
              <FormControl className="mt-3.5">
                <Input
                  className="no-focus paragraph-regular background-light900_dark300 light-border-2 text-dark300_light700 border min-h-[56px]"
                  {...field}
                />
              </FormControl>
              <FormDescription className="body-regular mt-2.5 text-light-500">
                Be specific and imagine you&apos;re are asking a question to
                another person.
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        {/* explanation */}
        <FormField
          control={form.control}
          name="explanation"
          render={({ field }) => (
            <FormItem className="flex flex-col w-full gap-3">
              <FormLabel className="paragraph-semibold text-dark400_light800">
                Detailed explanation of your question{" "}
                <span className="text-primary-500">*</span>
              </FormLabel>
              <FormControl className="mt-3.5">
                <Editor
                  apiKey={process.env.NEXT_PUBLIC_TINY_EDITOR_API_SECRET}
                  onInit={(_evt, editor) => {
                    //@ts-ignore
                    editorRef.current = editor;
                  }}
                  onBlur={field.onBlur}
                  onEditorChange={(content) => field.onChange(content)}
                  initialValue=""
                  init={{
                    height: 300,
                    menubar: false,
                    plugins: [
                      "advlist",
                      "autolink",
                      "lists",
                      "link",
                      "image",
                      "charmap",
                      "preview",
                      "anchor",
                      "searchreplace",
                      "visualblocks",
                      "codesample",
                      "fullscreen",
                      "insertdatetime",
                      "media",
                      "table",
                    ],
                    toolbar:
                      "undo redo | " +
                      "codesample | bold italic forecolor | alignleft aligncenter | " +
                      "alignright alignjustify | bullist numlist ",
                    content_style: "body { font-family:Inter; font-size:16px }",
                  }}
                />
              </FormControl>
              <FormDescription className="body-regular mt-2.5 text-light-500">
                Introduce the problem and expand on what you put in the title.
                Minimum 20 character.
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        {/* tags */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem className="flex flex-col w-full">
              <FormLabel className="paragraph-semibold text-dark400_light800">
                Tags<span className="text-primary-500">*</span>
              </FormLabel>
              <FormControl className="mt-3.5">
                <>
                  <Input
                    placeholder="Add tags..."
                    className="no-focus paragraph-regular background-light900_dark300 light-border-2 text-dark300_light700 border min-h-[56px]"
                    onKeyDown={(e) => handleKeyDown(e, field)}
                  />
                  {field.value.length > 0 && (
                    <div className="flex-start mt-2.5 gap-2.5">
                      {field.value.map((tag) => (
                        <Badge
                          key={tag}
                          className="subtle-medium background-light800_dark300 text-light400_light500 flex-center gap-2 rounded-md border-none px-4 py-2 capitalize"
                          onClick={() => handleTagRemove(tag, field)}
                        >
                          {tag}
                          <Image
                            src={"/assets/icons/close.svg"}
                            alt="Close icon"
                            width={12}
                            height={12}
                            className="cursor-pointer object-contain invert-0 dark:invert"
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              </FormControl>
              <FormDescription className="body-regular mt-2.5 text-light-500">
                Add up to 3 tags to describe what your question is about. You
                need to press enter to add a tag.
              </FormDescription>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />
        <Button
          disabled={isPending}
          type="submit"
          className="primary-gradient w-fit !text-light-900"
        >
          {isPending ? (
            <>{type === "create" ? "Posting..." : "Editing..."}</>
          ) : (
            <>{type === "create" ? "Ask a Question" : "Edit Question"}</>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default Question;
