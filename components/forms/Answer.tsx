"use client";
import React, { useState, useRef } from "react";
import { useTheme } from "@/context/ThemeContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { Editor } from "@tinymce/tinymce-react";
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "../ui/form";
import { AnswerSchema } from "@/lib/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../ui/button";
import { createAnswer } from "@/lib/actions/answer.action";
import { toast } from "../ui/use-toast";

interface IAnswer {
  authorId: string;
  questionId: string;
}
const Answer = ({ questionId, authorId }: IAnswer) => {
  const editorRef = useRef<null | Editor>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mode } = useTheme();
  const form = useForm<z.infer<typeof AnswerSchema>>({
    resolver: zodResolver(AnswerSchema),
    defaultValues: {
      answer: "",
    },
  });
  const onSubmit = async (val: z.infer<typeof AnswerSchema>) => {
    if (!authorId) {
      toast({
        title: "Login required.",
        description: "You must login first!",
      });
      return null;
    }
    try {
      setIsSubmitting(true);
      await createAnswer({
        content: val.answer,
        author: JSON.parse(authorId),
        question: JSON.parse(questionId),
        path: `/question/${JSON.parse(questionId)}`,
      });
      val.answer = "";
      setIsSubmitting(false);
    } catch (error: any) {
      console.error(error);
      throw error;
    }
  };
  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
        <h4 className="paragraph-semibold text-dark400_light800">
          Write your answer here
        </h4>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-10 w-full mt-6"
        >
          {/* answer */}
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem className="flex flex-col w-full gap-3">
                <FormControl className="mt-3.5">
                  <Editor
                    apiKey={process.env.NEXT_PUBLIC_TINY_EDITOR_API_KEY}
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
                      content_style:
                        "body { font-family:Inter; font-size:16px }",
                      skin: mode === "dark" ? "oxide-dark" : "oxide",
                      content_css: mode === "dark" ? "dark" : "light",
                    }}
                  />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button
              className="text-white primary-gradient w-fit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Answer;
