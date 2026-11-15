import {describe,it,expect} from "vitest";
import {registrationSchema,passwordSchema,tokenSchema,loginSchema} from "../../lib/auth/validation";
describe("account boundary validation",()=>{
 it("normalizes email and refuses client-provided administrator roles",()=>{const input={name:"Test Driver",email:"DRIVER@example.test",password:"StrongPassword2026"};expect(registrationSchema.parse(input).email).toBe("driver@example.test");expect(registrationSchema.safeParse({...input,role:"ADMIN"}).success).toBe(false);});
 it.each(["short1A","alllowercase2026","ALLUPPERCASE2026","NoNumbersInThisPassword","a".repeat(129)])("rejects a weak or excessive password",password=>expect(passwordSchema.safeParse(password).success).toBe(false));
 it("requires exact random-token format and bounds login input",()=>{expect(tokenSchema.safeParse("abc").success).toBe(false);expect(tokenSchema.safeParse("a".repeat(64)).success).toBe(true);expect(loginSchema.safeParse({email:"bad",password:""}).success).toBe(false);});
});
