"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  } else {
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  }
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};

export async function fetchIdeas(page: number = 1, pageSize: number = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('ideas')
    .select(`
      *,
      votes:user_votes(vote_type)
    `)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    console.error('Error fetching ideas:', error);
    throw error;
  }

  // Calculate rating from votes
  const ideasWithRating = data.map(idea => ({
    ...idea,
    rating: idea.votes?.reduce((sum: number, vote: { vote_type: number }) => sum + vote.vote_type, 0) || 0
  }));

  return ideasWithRating;
}

export async function updateIdeaRating(id: string, increment: number) {
  const supabase = await createClient();

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to vote');
  }

  // Check if user has already voted on this idea
  const { data: existingVotes } = await supabase
    .from('user_votes')
    .select('vote_type')
    .eq('user_id', user.id)
    .eq('idea_id', id);

  const existingVote = existingVotes?.[0];

  if (existingVote) {
    // If user is trying to vote the same way again, remove their vote
    if (existingVote.vote_type === increment) {
      const { error: deleteError } = await supabase
        .from('user_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('idea_id', id);

      if (deleteError) throw deleteError;
    } else {
      // If user is changing their vote, update it
      const { error: updateError } = await supabase
        .from('user_votes')
        .update({ vote_type: increment })
        .eq('user_id', user.id)
        .eq('idea_id', id);

      if (updateError) throw updateError;
    }
  } else {
    // New vote
    const { error: insertError } = await supabase
      .from('user_votes')
      .insert({ user_id: user.id, idea_id: id, vote_type: increment });

    if (insertError) throw insertError;
  }

  // Get the updated idea with its votes
  const { data: updatedIdea, error: fetchError } = await supabase
    .from('ideas')
    .select(`
      id,
      votes:user_votes(vote_type)
    `)
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw fetchError;

  // Calculate the new rating
  const rating = updatedIdea?.votes?.reduce((sum: number, vote: { vote_type: number }) => sum + vote.vote_type, 0) || 0;

  return { rating };
}
