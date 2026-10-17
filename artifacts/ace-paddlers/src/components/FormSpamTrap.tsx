export default function FormSpamTrap() {
  return <div hidden aria-hidden="true">
    <label>Leave this field empty<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
  </div>;
}
