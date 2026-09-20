"use client"
import useCreate[Entity] from "../../hooks/useCreate[Entity]"

type [Entity]FormCreateProps = { onClose: () => void }

const [Entity]FormCreate = ({ onClose }: [Entity]FormCreateProps) => {
  const { form, isPending } = useCreate[Entity]({ onSuccess: onClose })

  return (
    <div className="rounded border bg-gray-50 p-4">
      <h3 className="mb-3 font-semibold">Create [Entity]</h3>
      <form
        data-cy-submit-create-[entity-kebab]-form="create-[entity-kebab]-form"
        onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}
        className="grid gap-3"
      >
        {/* Add form.Field for each schema field; title input needs data-cy-create-[entity-kebab]-title-input="[entity-kebab]-title-input" */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            data-cy-create-[entity-kebab]-cancel-btn="create-[entity-kebab]-cancel"
            onClick={onClose}
            disabled={isPending}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-cy-submit-create-[entity-kebab]-btn="create-[entity-kebab]-submit"
            disabled={isPending}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </form>
    </div>
  )
}

export default [Entity]FormCreate
